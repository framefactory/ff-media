/**
 * FF Typescript Foundation Library
 * Copyright 2021 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { Provider } from "@ff/core/reactive";

import MIDIMessage, { MIDIStatus } from "./MIDIMessage";
import type MIDIDeviceState from "./MIDIDeviceState";

////////////////////////////////////////////////////////////////////////////////

export default class MIDIChannelState extends Provider
{
    readonly channel: number;
    readonly device: MIDIDeviceState;

    channelPressure = 0;
    pitchBend = 0;

    readonly activeNotes: MIDIMessage[][] = Array(128);
    readonly heldNotes: MIDIMessage[] = [];
    readonly controller: number[] = Array(128);
    readonly keyPressure: number[] = Array(128);

    onMessage: (message: MIDIMessage) => void = null;

    constructor(channel: number, device?: MIDIDeviceState)
    {
        super();
        this.channel = channel;
        this.device = device;

        for (let i = 0; i < 128; ++i) {
            this.activeNotes[i] = [];
            this.controller[i] = 0;
            this.keyPressure[i] = 0;
        }
    }

    get holdOn(): boolean {
        return this.controller[64] >= 64;
    }

    update(message: MIDIMessage)
    {
        const b1 = message.data[1];
        const b2 = message.data[2];

        switch(message.status) {
            case MIDIStatus.NoteOn:
                this.activeNotes[b1].push(message);
                break;

            case MIDIStatus.NoteOff:
                if (this.holdOn) {
                    this.heldNotes.push(message);
                    this.updated();
                    return;
                }
                else {
                    this.activeNotes[b1].shift();
                }
                break;

            case MIDIStatus.KeyPressure:
                this.keyPressure[message.data[1]] = message.data[2];
                break;
    
            case MIDIStatus.ControlChange:
                this.controller[message.controller] = message.value;
                if (b1 === 64 && b2 < 64) {
                    const heldNotes = this.heldNotes;
                    for (let i = 0, n = heldNotes.length; i < n; ++i) {
                        const heldNoteOff = heldNotes[i];
                        this.activeNotes[heldNoteOff.note].shift();

                        this.onMessage && this.onMessage(heldNoteOff);
                        this.device && this.device.onMessage && this.device.onMessage(heldNoteOff);
                    }
                    heldNotes.length = 0;
                }
                break;

            case MIDIStatus.PitchBend:
                this.pitchBend = message.pitchBend;
                break;

            case MIDIStatus.ChannelPressure:
                this.channelPressure = message.data[1];
                break;
        }

        this.onMessage && this.onMessage(message);
        this.device && this.device.onMessage && this.device.onMessage(message);

        this.updated();
    }

    reset()
    {
        this.channelPressure = 0;
        this.pitchBend = 0;
        this.heldNotes.length = 0;

        for (let i = 0; i < 128; ++i) {
            this.activeNotes[i] = [];
            this.controller[i] = 0;
            this.keyPressure[i] = 0;
        }

        this.updated();
    }
}