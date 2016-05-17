'use babel';

var path = require('path');

export default class RexView {

    constructor(serializedState) {
        // 親div ... HTMLのDIVタグで1つのブロックを定義する
        this.element = document.createElement('div');
        this.element.classList.add('rex');
    }

    clearMessage()
    {
        while (this.element.firstChild)
        {
            this.element.removeChild(this.element.firstChild);
        };
    }

    addMessage(str)
    {
        const message = document.createElement('div');
        message.textContent = str;
        message.style.color = "red";
        message.classList.add('message');
        this.element.appendChild(message);
    }

    test(event)
    {
        var prms = event.target.id.split(" : line = ");
        if(prms.length == 2)
        {
            console.log(event.target.id);
            var line = parseInt(prms[1].match(/\d+/));
            line = line>0? line-1: line;
            atom.workspace.open( path.resolve(prms[0]), {initialLine: line});
        }
    }
    test2(event)
    {
        console.log("aaaa");
    }

    addLink(str)
    {
        // label
    	var aTag = document.createElement("a");
    	aTag.href = "";
        aTag.style.color = "cyan";
    	aTag.textContent = str;
        aTag.onclick = this.test;
        aTag.ondblclick = this.test2;
        aTag.id = str;

        const message = document.createElement('div');
        message.classList.add('message');
        this.element.appendChild(aTag);

    	this.element.appendChild(message);
    }

    // Returns an object that can be retrieved when package is activated
    serialize()
    {
    }

    // Tear down any state and detach
    destroy() {
        this.element.remove();
    }

    getElement() {
        return this.element;
    }
}
