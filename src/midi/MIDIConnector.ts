/**
 * FF Typescript Foundation Library
 * Copyright 2025 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { MIDIMessage } from "./MIDIMessage.js";

////////////////////////////////////////////////////////////////////////////////

/**
 * Connects a MIDI input with a MIDI output and forwards incoming
 * MIDI messages to the output.
 */
export class MIDIConnector
{
    private _input: MIDIInput = null;
    private _output: MIDIOutput = null;

    public onProcessMessage: (message: MIDIMessage) => MIDIMessage | null = null;

    constructor()
    {
        this.onMessage = this.onMessage.bind(this);
        this.onInputStateChange = this.onInputStateChange.bind(this);
        this.onOutputStateChange = this.onOutputStateChange.bind(this);
    }

    async connect(input: MIDIInput, output: MIDIOutput)
    {
        this.disconnect();

        this._input = input;
        this._output = output;

        if (this._input) {
            await this._input.open();
            this._input.addEventListener("midimessage", this.onMessage);
            this._input.addEventListener("statechange", this.onInputStateChange);
        }
        if (this._output) {
            await this._output.open();
            this._output.addEventListener("statechange", this.onOutputStateChange);
        }
    }

    disconnect()
    {
        if (this._input) {
            this._input.removeEventListener("midimessage", this.onMessage);
            this._input.removeEventListener("statechange", this.onInputStateChange);
            this._input = null;
        }
        if (this._output) {
            this._output.removeEventListener("statechange", this.onOutputStateChange);
            this._output = null;
        }
    }

    get input(): MIDIInput {
        return this._input;
    }

    get output(): MIDIOutput {
        return this._output;
    }

    private onMessage(event: MIDIMessageEvent)
    {
        if (this._output && this._output.state === "connected") {
            let data = event.data;
            let timeStamp = event.timeStamp;

            if (this.onProcessMessage) {
                let message = new MIDIMessage(data, timeStamp);
                message = this.onProcessMessage(message);
                if (!message) {
                    return; // message was filtered out
                }
                data = Uint8Array.from(message.data);
                timeStamp = message.time;
            }

            this._output.send(data, timeStamp);
        }
    }

    private onInputStateChange(event: MIDIConnectionEvent)
    {
        const port = event.port;
        console.debug("[MIDIConnector] input state changed:", port);
    
        if (port.state === "disconnected") {
            this.disconnect();
        }
        else if (port.state == "connected" && this._output.state === "connected") {
            this.connect(this._input, this._output);
        }
    }

    private onOutputStateChange(event: MIDIConnectionEvent)
    {
        const port = event.port;
        console.debug("[MIDIConnector] output state changed:", port);

        if (port.state === "disconnected") {
            this.disconnect();
        }
        else if (port.state == "connected" && this._input.state === "connected") {
            this.connect(this._input, this._output);
        }
    }
}