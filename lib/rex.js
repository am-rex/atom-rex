'use babel';

import RexView from './rex-view';
import { CompositeDisposable } from 'atom';

var path = require('path');
var fs = require('fs');

var jumpHistory = new Array();
var jumpHistoryIndex = 0;

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

        this.subscriptions = new CompositeDisposable();

        // Register command
        this.subscriptions.add(atom.commands.add('atom-text-editor',
        { 'rex:jumpDefine': () => this.jumpDefine() }));
        this.subscriptions.add(atom.commands.add('atom-text-editor',
        { 'rex:jumpBack': () => this.jumpBack() }));
        this.subscriptions.add(atom.commands.add('atom-text-editor',
        { 'rex:jumpForward': () => this.jumpForward() }));
        this.subscriptions.add(atom.commands.add('atom-text-editor',
        { 'core:cancel': () => this.closePanel() }));
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
    
    jumpBack()
    {
        if(jumpHistory.length > 0 && jumpHistoryIndex > 0)
        {
            jumpHistoryIndex--;
            atom.workspace.open(
                path.resolve(jumpHistory[jumpHistoryIndex].file),
                {initialLine: jumpHistory[jumpHistoryIndex].line});
        }
    },

    jumpForward()
    {
        if(jumpHistoryIndex < jumpHistory.length - 1)
        {
            jumpHistoryIndex++;
            atom.workspace.open(
                path.resolve(jumpHistory[jumpHistoryIndex].file),
                {initialLine: jumpHistory[jumpHistoryIndex].line});
        }
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
                if( files[j].toLowerCase()=="tags" )
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
            else
            {
                var foundFunc = false;
                var funcIndex = 0;
                for ( var i = 0; i < outArray.length; i++ )
                {
                    var prms = outArray[i].split(/\t/);
                    if(prms.length >= 4)
                    {
                        if(prms[3]=="f")
                        {
                            if(foundFunc == true)
                            {
                                foundFunc = false;
                                break;
                            }
                            funcIndex = i;
                            foundFunc = true;
                        }
                    }
                }

                if(foundFunc || outArray.length==1)
                {
                    var prms = outArray[funcIndex].split(/\t/);
                    if(prms.length >= 2)
                    {
                        var line = prms.length >= 3? parseInt(prms[2].match(/\d+/)): 0;
                        this.openFile(path.resolve(tagDir + path.sep + prms[1]), line);
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
                            this.rexView.setCallback(this.openFile);
                        }
                    }
                }
            }
        }
        else
        {
            this.setMessage('tags file is not found!');
        }
    },

    openFile(name, line)
    {
        line = line>0? line-1: line;

        var actItem = atom.workspace.getActivePaneItem();
        var curPos = actItem.getCursorBufferPosition();

        if(name == actItem.getPath() && line==curPos.row)
        {
            return;
        }

        if(jumpHistory.length==0)
        {
            jumpHistory.push({file:actItem.getPath(), line:curPos.row});
        }
        else if(jumpHistory.length > 0 && jumpHistoryIndex<jumpHistory.length)
        {
            var last = jumpHistory[jumpHistoryIndex];
            if(last.line != curPos.row || last.file != path.resolve(actItem.getPath()))
            {
                jumpHistory = jumpHistory.slice(0, jumpHistoryIndex + 1);
                jumpHistoryIndex++;
                jumpHistory.push({file:actItem.getPath(), line:curPos.row});
            }
        }

        jumpHistory = jumpHistory.slice(0, jumpHistoryIndex+1);
        jumpHistory.push({file:name, line:line});
        jumpHistoryIndex++;

        atom.workspace.open(name, {initialLine: line});
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
