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


export class MIDIManager extends Publisher
{
    static isWebMidiSupported(): boolean
    {
        return navigator["requestMIDIAccess"] !== undefined;
    }

    static async requestMidi(options?: MIDIOptions): Promise<MIDIAccess>
    {
        if (!this.isWebMidiSupported()) {
            throw new Error("WebMIDI not supported by browser");
        }

        return navigator.requestMIDIAccess(options);
    }

    static portName(port: MIDIInput | MIDIOutput)
    {
        return `${port.name} (${port.manufacturer})`;
    }

    static portDescription(port: MIDIInput | MIDIOutput)
    {
        return `${port.name} (Manufacturer: ${port.manufacturer}, ID: ${port.id})`;
    }


    private _midi: MIDIAccess = null;
    private _activeIns: Map<string, MIDIInput> = new Map();
    private _activeOuts: Map<string, MIDIOutput> = new Map();


    constructor()
    {
        super();
        this.addEvents("message", "connection");

        this.onMessageEvent = this.onMessageEvent.bind(this);
        this.onConnectionEvent = this.onConnectionEvent.bind(this);
    }

    /**
     * Initializes WebMIDI. Throws if the service is unavailable or if the
     * page hasn't been given permission to access it.
     * @param options A midi options object. 
     */
    async initialize(options?: MIDIOptions)
    {
        options = options || { sysex: true };
        this._midi = await MIDIManager.requestMidi(options);
        this._midi.addEventListener("statechange", this.onConnectionEvent);
    }

    /** Returns the list of all available MIDI input ports. */
    get inputs(): MIDIInput[] {
        return Array.from(this._midi.inputs, arr => arr[1]);
    }
    /** Returns the list of all available MIDI output ports. */
    get outputs(): MIDIOutput[] {
        return Array.from(this._midi.outputs, arr => arr[1]);
    }

    /** Returns the names of all available MIDI input ports. */
    get inputNames(): string[] {
        return Array.from(this._midi.inputs, arr => MIDIManager.portName(arr[1]));
    }
    /** Returns the names of all available MIDI output ports. */
    get outputNames(): string[] {
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

    /** Returns an array of active/open MIDI input ports. */
    get openInputs(): MIDIInput[] {
        return Array.from(this._activeIns.values());
    }
    /** Returns an array of active/open MIDI output ports. */
    get openOutputs(): MIDIOutput[] {
        return Array.from(this._activeOuts.values());
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

    /**
     * Opens the given MIDI input for communication.
     * @param input The input port to be opened.
     * @returns The open port if successful, null otherwise.
     */
    async openInput(input: MIDIInput): Promise<MIDIInput|null>
    {
        try {
            const port = await input.open() as MIDIInput;
            if (!this._activeIns.has(port.id)) {
                this._activeIns.set(port.id, port);
                port.addEventListener("midimessage", this.onMessageEvent);
            }
            return port;
        }
        catch (e) {
            console.warn(`[MIDIManager] failed to activate MIDI input: ${MIDIManager.portName(input)}`);
            return null;
        }
    }

    /**
     * Closes the given MIDI input for communication.
     * @param input The input port to be closed.
     */
    async closeInput(input: MIDIInput): Promise<void>
    {
        try {
            if (this._activeIns.has(input.id)) {
                this.removeEventListener("midimessage", this.onMessageEvent);
                this._activeIns.delete(input.id);
                await input.close();
            }
        }
        catch (e) {
            // do nothing
        }
    }

    /**
     * Opens the given MIDI output for communication.
     * @param output The output port to be opened.
     * @returns The open port if successful, null otherwise.
     */
    async openOutput(output: MIDIOutput): Promise<MIDIOutput|null>
    {
        try {
            const port = await output.open() as MIDIOutput;
            if (!this._activeOuts.has(port.id)) {
                this._activeOuts.set(port.id, port);
            }
            return port;
        }
        catch (e) {
            console.warn(`[MIDIManager] failed to activate MIDI output: ${MIDIManager.portName(output)}`);
            return null;
        }
    }

    /**
     * Closes the given MIDI output for communication.
     * @param output The output port to be closed.
     */
    async closeOutput(output: MIDIOutput): Promise<void>
    {
        try {
            if (this._activeOuts.has(output.id)) {
                this._activeOuts.delete(output.id);
                await output.close();
            }
        }
        catch (e) {
            // do nothing
        }
    }

    
    protected onMessageEvent(event: MIDIMessageEvent)
    {
        const message = new MIDIMessage(event);
        this.emit("message", message);
    }

    protected onConnectionEvent(event: MIDIConnectionEvent)
    {
        this.emit("connection", event);
    }
}