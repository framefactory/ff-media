/**
 * FF Typescript Foundation Library
 * Copyright 2021 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { Provider } from "@ff/core/reactive";

import MIDIMessage, { MIDIMessageType } from "./MIDIMessage";
import MIDIChannelState from "./MIDIChannelState";

////////////////////////////////////////////////////////////////////////////////

export default class MIDIDeviceState extends Provider
{
    readonly channels: MIDIChannelState[] = [];
    readonly omni: MIDIChannelState;

    constructor()
    {
        super();

        for (let i = 0; i < 16; ++i) {
            this.channels.push(new MIDIChannelState(i));
        }

        this.omni = new MIDIChannelState(-1);
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
    }
}