'use babel';

import RexView from './rex-view';
import { CompositeDisposable } from 'atom';

var path = require('path');
var fs = require('fs');

export default
{
    rexView: null,
    modalPanel: null,
    subscriptions: null,

    activate(state)
    {
        this.rexView = new RexView(state.rexViewState);
        this.modalPanel = atom.workspace.addBottomPanel({
            item: this.rexView.getElement(),
            visible: false
        });

        // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
        // アトムのシステム内にサブスクライブイベントは、簡単にCompositeDisposableを使用してクリーンアップすることができます
        this.subscriptions = new CompositeDisposable();

        // Register command that toggles this view
        this.subscriptions.add(atom.commands.add('atom-workspace',
        { 'rex:jumpDefine': () => this.jumpDefine() }));
        this.subscriptions.add(atom.commands.add('atom-workspace',
        { 'rex:closePanel': () => this.closePanel() }));
    },

    deactivate()
    {
        this.modalPanel.destroy();
        this.subscriptions.dispose();
        this.rexView.destroy();
    },

    serialize()
    {
        return { rexViewState: this.rexView.serialize() };
    },

    jumpDefine()
    {
        this.modalPanel.hide();

        var actItem = atom.workspace.getActivePaneItem();
        var targetWord = "" + actItem.getSelectedText();

        if(targetWord.length > 0)
        {
            targetWord = "" + targetWord.match(/^[a-zA-Z0-9_]*/);
        }
        else
        {
            var curPos = actItem.getCursorBufferPosition();
            var curLine = actItem.lineTextForBufferRow(curPos.row);
            var backward = curLine.substr(0, curPos.column);
            var forward  = curLine.substr(curPos.column);
            targetWord = backward.match(/[a-zA-Z0-9_]*$/) + forward.match(/^[a-zA-Z0-9_]*/);
        }

        if(targetWord.length <= 0)
        {
            return;
        }
        if(targetWord.match(/^\d+$/) == targetWord)
        {
            return;
        }

        var tagDir = path.resolve(actItem.getPath() + path.sep + "..");
        var tagFilePath = "";
        for(var i=0; i<100; i++)
        {
            var files = fs.readdirSync(tagDir);
            for(var j=0; j<files.length; j++)
            {
                if( files[j].toLowerCase()=="tags" ||
                    files[j].toLowerCase()==".tags")
                {
                    if(fs.statSync(tagDir + path.sep + files[j]).isFile())
                    {
                        tagFilePath = tagDir + path.sep + files[j];
                        break;
                    }
                }
            }

            if(tagFilePath.length > 0)
            {
                // タグファイルを発見した
                break;
            }

            var parentDir = path.resolve(tagDir + path.sep + "..");
            if(parentDir != tagDir)
            {
                tagDir = parentDir;
            }
            else
            {
                // ルートディレクトリまで探してもタグファイルがなかった
                break;
            }
        }

        if(tagFilePath.length > 0)
        {
            var outArray = new Array();
            var buffer = fs.readFileSync(tagFilePath, "UTF8");
            var lines = buffer.replace(/\r\n|\r/g, "\n").split('\n');
            var re = new RegExp("^" + targetWord + "\t");
            for ( var i = 0; i < lines.length; i++ )
            {
                if( lines[i].match(re) )
                {
                    outArray.push( lines[i] );
                }
            }
            if(outArray.length <= 0)
            {
                this.setMessage('"'+targetWord+'" is not found in "'+tagFilePath+'"');
            }
            else if (outArray.length == 1)
            {
                var prms = outArray[0].split(/\t/);
                if(prms.length >= 2)
                {
                    var line = prms.length >= 3? parseInt(prms[2].match(/\d+/)): 0;
                    line = line>0? line-1: line;
                    atom.workspace.open(
                        path.resolve(tagDir + path.sep + prms[1]),
                        {initialLine: line});
                }
                else
                {
                    this.setMessage('"'+ tagFilePath +'" is invalid!');
                }
            }
            else
            {
                this.setMessage('Found multiple "'+ targetWord +'"');
                for ( var i = 0; i < outArray.length && i<30; i++ )
                {
                    var prms = outArray[i].split(/\t/);
                    if(prms.length >= 2)
                    {
                        var line = prms.length >= 3? parseInt(prms[2].match(/\d+/)): 0;
                        line = " : line = " + (line>0? line : "?");
                        this.addMessageLink(path.resolve(tagDir + path.sep + prms[1]) + line);
                    }
                }
            }
        }
        else
        {
            this.setMessage('tags or .tags file is not found!');
        }
    },

    setMessage(s)
    {
        console.log(s);
        this.rexView.clearMessage();
        this.rexView.addMessage(s);
        this.modalPanel.show();
    },

    addMessageLink(str)
    {
        console.log(str);
        this.rexView.addLink(str);
        this.modalPanel.show();
    },

    closePanel()
    {
        this.modalPanel.hide();
    }
};
