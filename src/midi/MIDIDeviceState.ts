/**
 * FF Typescript Foundation Library
 * Copyright 2025 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { Provider } from "@ffweb/core/reactive.js";

import { MIDIMessage, MIDIMessageType } from "./MIDIMessage.js";
import { MIDIChannelState } from "./MIDIChannelState.js";

////////////////////////////////////////////////////////////////////////////////

export class MIDIDeviceState extends Provider
{
    readonly channels: MIDIChannelState[] = [];
    readonly omni: MIDIChannelState;

    onMessage: (message: MIDIMessage) => void = null;

    constructor()
    {
        super();

        for (let i = 0; i < 16; ++i) {
            this.channels.push(new MIDIChannelState(i, this));
        }

        this.omni = new MIDIChannelState(-1);
    }

    getChannelState(index: number)
    {
        return index >= 0 && index < 16 ? this.channels[index] : this.omni;
    }

    update(message: MIDIMessage): void
    {
        switch(message.type) {
            case MIDIMessageType.Channel:
                this.channels[message.channel].update(message);
                this.omni.update(message);
                break;
        }

        this.updated();
    }

    reset(): void
    {
        for (let i = 0; i < 16; ++i) {
            this.channels[i].reset();
        }

        this.omni.reset();
        this.updated();
    }
}