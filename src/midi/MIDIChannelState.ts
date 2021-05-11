/**
 * FF Typescript Foundation Library
 * Copyright 2021 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import MIDIMessage, {
    MIDIStatus
} from "./MIDIMessage";

////////////////////////////////////////////////////////////////////////////////

export default class MIDIChannelState
{
    readonly channel: number;

    channelPressure = 0;
    pitchBend = 0;
    readonly activeNotes: MIDIMessage[][] = Array(128);
    readonly heldNotes: MIDIMessage[] = [];
    readonly controller: number[] = Array(128);
    readonly keyPressure: number[] = Array(128);

    constructor(channel: number)
    {
        this.channel = channel;

        for (let i = 0; i < 128; ++i) {
            this.activeNotes[i] = [];
            this.controller[i] = 0;
            this.keyPressure[i] = 0;
        }
    }

    get holdEnabled(): boolean {
        return this.controller[64] >= 64;
    }

    update(message: MIDIMessage)
    {
        const b1 = message.data[1];
        const b2 = message.data[2];

        switch(message.status) {
            case MIDIStatus.NoteOn:
                if (b2 > 0) {
                    this.activeNotes[b1].push(message);
                }
                else if (this.holdEnabled) {
                    this.heldNotes.push(message);
                }
                else {
                    this.activeNotes[b1].shift();
                }
                break;

            case MIDIStatus.NoteOff:
                if (this.holdEnabled) {
                    this.heldNotes.push(message);
                }
                else {
                    this.activeNotes[b1].shift();
                }
                break;

            case MIDIStatus.ControlChange:
                this.controller[message.controller] = message.value;
                if (b1 === 64 && b2 < 64) {
                    const heldNotes = this.heldNotes;
                    for (let i = 0, n = heldNotes.length; i < n; ++i) {
                        this.activeNotes[heldNotes[i].note].shift();
                    }
                    heldNotes.length = 0;
                }
                break;

            case MIDIStatus.PitchBend:
                // TODO: Implement
                break;

            case MIDIStatus.KeyPressure:
                // TODO: Implement
                break;
        }
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
    }
}