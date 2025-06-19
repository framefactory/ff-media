/**
 * FF Typescript Foundation Library
 * Copyright 2025 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { MIDIMessage, MIDIMessageType, MIDIStatus } from "./MIDIMessage.js";

////////////////////////////////////////////////////////////////////////////////

export { MIDIMessage, MIDIStatus };


export default class MIDIDevice
{
    private _deviceId = 0;
    private _manufacturerId: number | number[] = 0;
    private _midiInput: MIDIInput = null;
    private _midiOutput: MIDIOutput = null;

    constructor(
        manufacturerId: number | number[],
        deviceId?: number,
        midiInput?: MIDIInput,
        midiOutput?: MIDIOutput
    )
    {
        this.onMidiMessage = this.onMidiMessage.bind(this);
        this.onMidiState = this.onMidiState.bind(this);

        this._manufacturerId = manufacturerId;
        this.deviceId = deviceId || 0x10;

        if (midiInput) {
            this.input = midiInput;
        }
        if (midiOutput) {
            this.output = midiOutput;
        }
    }

    get manufacturerId() {
        return this._manufacturerId;
    }

    set deviceId(value: number) {
        this._deviceId = value;
    }
    get deviceId(): number {
        return this._deviceId;
    }

    set input(input: MIDIInput) {
        const prev = this._midiInput;
        if (prev) {
            prev.removeEventListener("midimessage", this.onMidiMessage);
            prev.removeEventListener("statechange", this.onMidiState);
        }

        this._midiInput = input;

        if (input) {
            input.addEventListener("midimessage", this.onMidiMessage);
            input.addEventListener("statechange", this.onMidiState);
        }

        this.onMidiInputChanged(prev, input);
    }
    get input(): MIDIInput {
        return this._midiInput;
    }

    set output(output: MIDIOutput) {
        const prev = this._midiOutput;
        this._midiOutput = output;

        this.onMidiOutputChanged(prev, output);
    }
    get output(): MIDIOutput {
        return this._midiOutput;
    }

    async requestIdentity(): Promise<void>
    {
        const data = MIDIMessage.universalNRTSysEx(this._deviceId, 0x06, 0x01);
        this.sendMessage(data);
    }

    sendMessage(data: Uint8Array, time?: number): void
    {
        if (this._midiOutput) {
            this._midiOutput.send(data, time);
        }
    }

    toString(): string
    {
        const inp = this._midiInput;
        const out = this._midiOutput;
        const inpName = inp ? `${inp.name} (${inp.manufacturer}, ID: ${inp.id})` : "N/A";
        const outName = out ? `${out.name} (${out.manufacturer}, ID: ${out.id})` : "N/A";
        return `MIDIDevice, ID: ${this._deviceId}, Input: ${inpName}, Output: ${outName}`;
    }

    protected onMidiMessage(event: MIDIMessageEvent): void
    {
        const message = new MIDIMessage(event);
        switch(message.type) {
            case MIDIMessageType.Channel:
                return this.onMidiChannelMessage(message);
            case MIDIMessageType.System:
                return this.onMidiSystemMessage(message);
            case MIDIMessageType.SysEx:
                return this.onMidiSysExMessage(message);
        }
    }

    protected onMidiChannelMessage(message: MIDIMessage): void
    {
        return;
    }

    protected onMidiSystemMessage(message: MIDIMessage): void
    {
        return;
    }

    protected onMidiSysExMessage(message: MIDIMessage): void
    {
        return;
    }

    protected onMidiState(event: MIDIConnectionEvent): void
    {
        console.log("[MIDIDevice.onMidiState]", event);
    }

    protected onMidiInputChanged(prev: MIDIInput, next: MIDIInput): void
    {
        console.log("[MIDIDevice.onMidiInputChanged]");
    }

    protected onMidiOutputChanged(prev: MIDIOutput, next: MIDIOutput): void
    {
        console.log("[MIDIDevice.onMidiOutputChanged]");
    }
}
