/**
 * FF Typescript Foundation Library
 * Copyright 2025 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { Publisher } from "@ffweb/core/Publisher.js";
import { MIDIMessage, MIDIMessageType } from "./MIDIMessage.js";

////////////////////////////////////////////////////////////////////////////////

export { MIDIMessage, MIDIMessageType };


/**
 * Manages MIDI ports and connections. Acts as an event publisher for
 * connection events and MIDI messages.
 */
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


    constructor()
    {
        super();
        
        this.addEvents(
            "message", 
            "connection"
        );

        this.onMessageEvent = this.onMessageEvent.bind(this);
        this.onConnectionEvent = this.onConnectionEvent.bind(this);
    }

    get ready(): boolean {
        return !!this._midi;
    }
    get midi(): MIDIAccess {
        return this._midi;
    }

    /** Gets the currently active MIDI input port. */
    get activeInput(): MIDIInput {
        this.ensureInitialized();
        return this._midi.inputs.get(this._activeInputId);
    }
    /** Makes the given input port the active MIDI input. */
    set activeInput(input: MIDIInput) {
        this.setActiveInput(input);
    }

    /** Gets the currently active MIDI output port. */
    get activeOutput(): MIDIOutput {
        this.ensureInitialized();
        return this._midi.outputs.get(this._activeOutputId);
    }
    /** Makes the given output port the active MIDI output. */
    set activeOutput(output: MIDIOutput) {
        this.setActiveOutput(output);
    }

    /** Gets the id of the currently active MIDI input port. */
    get activeInputId(): string {
        return this._activeInputId;
    }
    /** Makes the output port with the given id the active MIDI output. */
    set activeInputId(id: string) {
        this.setActiveInput(id);
    }

    /** Gets the id of the currently active MIDI output port. */
    get activeOutputId(): string {
        return this._activeOutputId;
    }
    /** Makes the input port with the given id the active MIDI input. */
    set activeOutputId(id: string) {
        this.setActiveOutput(id);
    }

    /** Returns the list of all available MIDI input ports. */
    get inputs(): MIDIInput[] {
        this.ensureInitialized();
        return Array.from(this._midi.inputs, arr => arr[1]);
    }
    /** Returns the list of all available MIDI output ports. */
    get outputs(): MIDIOutput[] {
        this.ensureInitialized();
        return Array.from(this._midi.outputs, arr => arr[1]);
    }

    /** Returns the names of all available MIDI input ports. */
    get inputNames(): string[] {
        this.ensureInitialized();
        return Array.from(this._midi.inputs, arr => MIDIManager.portName(arr[1]));
    }
    /** Returns the names of all available MIDI output ports. */
    get outputNames(): string[] {
        this.ensureInitialized();
        return Array.from(this._midi.outputs, arr => MIDIManager.portName(arr[1]));
    }

    /** Returns true if there are any MIDI input ports available. */
    get hasInputs(): boolean {
        return this._midi.inputs.size > 0;
    }
    /** Returns true if there are any MIDI output ports available. */
    get hasOutputs(): boolean {
        return this._midi.outputs.size > 0;
    }

    /**
     * Returns the MIDI input port whose name contains or id matches
     * the given query string. String comparison is case-insensitive.
     */
    findInput(query: string): MIDIInput | null
    {
        query = query.toLowerCase();
        const inputs = this.inputs;
        const port = Array.from(inputs).find(
            port => port.name.toLowerCase().includes(query) || port.id === query);
        return port || null;
    }

    /**
     * Returns the MIDI output port whose name contains or id matches
     * the given query string. String comparison is case-insensitive.
     */
    findOutput(query: string): MIDIOutput | null
    {
        query = query.toLowerCase();
        const outputs = this.outputs;
        const port = Array.from(outputs).find(
            port => port.name.toLowerCase().includes(query) || port.id === query);
        return port || null;
    }

    async initialize(options?: MIDIOptions): Promise<MIDIAccess>
    {
        if (navigator["requestMIDIAccess"] === undefined) {
            throw new Error("MIDI not supported");
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

    dumpPorts()
    {
        console.log("MIDI Inputs");
        this.inputs.forEach((port, index) => console.log("#%s %s", index, MIDIManager.portDescription(port)));
        console.log("MIDI Outputs");
        this.outputs.forEach((port, index) => console.log("#%s %s", index, MIDIManager.portDescription(port)));
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
                oldPort.removeEventListener("midimessage", this.onMessageEvent);
                oldPort.removeEventListener("statechange", this.onConnectionEvent);
            }

            this._activeInputId = id;
            port.addEventListener("midimessage", this.onMessageEvent);
            port.addEventListener("statechange", this.onConnectionEvent);

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

    protected ensureInitialized()
    {
        if (!this._midi) {
            throw new Error("MIDI not available, forgot to initialize manager?");
        }
    }

    private onMessageEvent(event: MIDIMessageEvent)
    {
        // convert Note On with velocity 0 to Note Off
        const data = event.data;
        if (data.length > 2 && (data[0] & 0xf0) === 0x90 && data[2] === 0) {
            data[0] = 0x80 | (data[0] & 0x0f);
        }

        const message = new MIDIMessage(event);
        this.emit("message", message);
    }

    private onConnectionEvent(event: MIDIConnectionEvent)
    {
        this.emit("connection", event);
    }
}