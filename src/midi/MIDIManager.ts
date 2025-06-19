/**
 * FF Typescript Foundation Library
 * Copyright 2025 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { Publisher } from "@ffweb/core/Publisher.js";
import { MIDIMessage } from "./MIDIMessage.js";

////////////////////////////////////////////////////////////////////////////////

export { MIDIMessage };


export class MIDIManager extends Publisher
{
    static portName(port: MIDIInput | MIDIOutput)
    {
        return `${port.name} (${port.manufacturer})`;
    }

    static portDescription(port: MIDIInput | MIDIOutput)
    {
        return `${port.name} (Manufacturer: ${port.manufacturer}, ID: ${port.id})`;
    }
    
    private _midi: MIDIAccess = null;
    private _activeInputId = "";
    private _activeOutputId = "";

    /**
     * Manages Web Midi ports and connections.
     */
    constructor()
    {
        super();
        
        this.addEvents(
            "message-event", 
            "message", 
            "connection-event", 
            "connection"
        );

        this._onMessageEvent = this._onMessageEvent.bind(this);
        this._onConnectionEvent = this._onConnectionEvent.bind(this);
    }

    get ready(): boolean {
        return !!this._midi;
    }
    get midi(): MIDIAccess {
        return this._midi;
    }

    get activeInput(): MIDIInput {
        this.ensureInitialized();
        return this._midi.inputs.get(this._activeInputId);
    }
    set activeInput(input: MIDIInput) {
        this.setActiveInput(input);
    }

    get activeOutput(): MIDIOutput {
        this.ensureInitialized();
        return this._midi.outputs.get(this._activeOutputId);
    }
    set activeOutput(output: MIDIOutput) {
        this.setActiveOutput(output);
    }

    get activeInputId(): string {
        return this._activeInputId;
    }
    set activeInputId(id: string) {
        this.setActiveInput(id);
    }

    get activeOutputId(): string {
        return this._activeOutputId;
    }
    set activeOutputId(id: string) {
        this.setActiveOutput(id);
    }

    get inputs(): MIDIInput[] {
        this.ensureInitialized();
        return Array.from(this._midi.inputs, arr => arr[1]);
    }
    get outputs(): MIDIOutput[] {
        this.ensureInitialized();
        return Array.from(this._midi.outputs, arr => arr[1]);
    }

    get inputNames(): string[] {
        this.ensureInitialized();
        return Array.from(this._midi.inputs, arr => MIDIManager.portName(arr[1]));
    }
    get outputNames(): string[] {
        this.ensureInitialized();
        return Array.from(this._midi.outputs, arr => MIDIManager.portName(arr[1]));
    }

    get hasInputs(): boolean {
        return this._midi.inputs.size > 0;
    }
    get hasOutputs(): boolean {
        return this._midi.outputs.size > 0;
    }

    async initialize(options?: MIDIOptions): Promise<MIDIAccess>
    {
        if (navigator["requestMIDIAccess"] === undefined) {
            return Promise.reject("MIDI not supported");
        }

        return navigator.requestMIDIAccess(options).then(midi => {
            this._midi = midi;

            if (localStorage) {
                const inId = localStorage.getItem("MIDIManager.activeInput");
                if (inId) {
                    this.setActiveInput(inId);
                }

                const outId = localStorage.getItem("MIDIManager.activeOutput");
                if (outId) {
                    this.setActiveOutput(outId);
                }
            }

            return midi;
        });
    }

    protected setActiveInput(input: MIDIInput | string)
    {
        this.ensureInitialized();

        const inputs = this._midi.inputs;
        let id = typeof input === "string" ? input : input.id;
        let port = inputs.get(id);

        if (!port) {
            port = Array.from(inputs).filter(arr => arr[1].name === input).map(arr => arr[1])[0];
            id = port ? port.id : "";
        }

        if (port) {
            const oldPort = this.activeInput;
            if (oldPort) {
                oldPort.removeEventListener("midimessage", this._onMessageEvent);
                oldPort.removeEventListener("statechange", this._onConnectionEvent);
            }

            this._activeInputId = id;
            port.addEventListener("midimessage", this._onMessageEvent);
            port.addEventListener("statechange", this._onConnectionEvent);

            if (localStorage) {
                localStorage.setItem("MIDIManager.activeInput", port.id);
            }

            console.log("[MIDIManager] Active input: %s", MIDIManager.portDescription(port));
        }
    }

    protected setActiveOutput(output: MIDIOutput | string)
    {
        this.ensureInitialized();

        const outputs = this._midi.outputs;
        let id = typeof output === "string" ? output : output.id;
        let port = outputs.get(id);
        
        if (!port) {
            port = Array.from(outputs).filter(arr => arr[1].name === output).map(arr => arr[1])[0];
            id = port ? port.id : "";
        }

        if (port) {
            const oldPort = this.activeOutput;
            if (oldPort) {
                oldPort.removeEventListener("statechange", this.onConnectionEvent);
            }

            this._activeOutputId = id;
            port.addEventListener("statechange", this.onConnectionEvent);

            if (localStorage) {
                localStorage.setItem("MIDIManager.activeOutput", port.id);
            }

            console.log("[MIDIManager] Active output: %s", MIDIManager.portDescription(port));
        }
    }

    dumpPorts()
    {
        console.log("MIDI Inputs");
        this.inputs.forEach((port, index) => console.log("#%s %s", index, MIDIManager.portDescription(port)));
        console.log("MIDI Outputs");
        this.outputs.forEach((port, index) => console.log("#%s %s", index, MIDIManager.portDescription(port)));
    }

    protected ensureInitialized()
    {
        if (!this._midi) {
            throw new Error("MIDI not available, forgot to initialize manager?");
        }
    }

    protected onMessageEvent(event: MIDIMessageEvent)
    {
        const message = new MIDIMessage(event);
        this.emit("message", message);
    }

    protected onConnectionEvent(event: MIDIConnectionEvent)
    {
        console.log("[MIDIManager] state event:", event);
        //this.emit("connection", event);
    }

    private _onMessageEvent(event: MIDIMessageEvent)
    {
        // convert Note On with velocity 0 to Note Off
        const data = event.data;
        if (data.length > 2 && (data[0] & 0xf0) === 0x90 && data[2] === 0) {
            data[0] = 0x80 | (data[0] & 0x0f);
        }

        this.emit("message-event", event);
        this.onMessageEvent(event);
    }

    private _onConnectionEvent(event: MIDIConnectionEvent)
    {
        this.emit("connection-event", event);
        this.onConnectionEvent(event);
    }
}