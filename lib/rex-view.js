'use babel';

var path = require('path');

export default class RexView {

    setCallback(cb)
    {
        callbackOpen = cb;
    }

    constructor(serializedState)
    {
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

    onClickEvent(event)
    {
        var prms = event.target.id.split(" : line = ");
        if(prms.length == 2)
        {
            if(callbackOpen)
            {
                console.log(event.target.id);
                var line = parseInt(prms[1].match(/\d+/));
                callbackOpen(prms[0], line);
            }
        }
    }

    addLink(str)
    {
    	var aTag = document.createElement("a");
    	aTag.href = "";
        aTag.style.color = "cyan";
    	aTag.textContent = str;
        aTag.onclick = this.onClickEvent;
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
