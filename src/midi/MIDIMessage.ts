/**
 * FF Typescript Foundation Library
 * Copyright 2025 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import { MIDIStatus } from "./MIDIStatus.js";
import { MIDINote } from "./MIDINote.js";
import { MIDIController } from "./MIDIController.js";

////////////////////////////////////////////////////////////////////////////////

export { MIDIStatus, MIDINote, MIDIController };

export enum MIDIMessageType
{
    Channel,
    System,
    SysEx,
}

export class MIDIMessage
{
    static convertZeroVelToNoteOff: boolean = true;

    static fromArray(...bytes: Array<number>): Uint8Array {
        return new Uint8Array(bytes);
    }

    static noteOn(channel: number, note: MIDINote, velocity: number): Uint8Array {
        return new Uint8Array([ MIDIStatus.NoteOn | channel, note, velocity ]);
    }

    static noteOff(channel: number, note: MIDINote, velocity = 0): Uint8Array {
        return new Uint8Array([ MIDIStatus.NoteOff | channel, note, velocity ]);
    }

    static controlChange(channel: number, controller: number, value: number): Uint8Array {
        return new Uint8Array([ MIDIStatus.ControlChange | channel, controller, value ]);
    }

    static programChange(channel: number, program: number): Uint8Array {
        return new Uint8Array([ MIDIStatus.ProgramChange | channel, program ]);
    }

    static universalNRTSysEx(deviceId: number, sid1: number, sid2?: number, data?: number[]): Uint8Array {
        let message = [ MIDIStatus.SystemExclusive, 0x7e, deviceId, sid1 ];
        if (sid2 !== undefined) {
            message.push(sid2);
        }
        if (data !== undefined) {
            message = message.concat(data);
        }

        return new Uint8Array(message);
    }

    static universalRTSysEx(deviceId: number, sid1: number, sid2: number, data?: number[]): Uint8Array {
        let message = [ MIDIStatus.SystemExclusive, 0x7e, deviceId, sid1, sid2 ];
        if (data !== undefined) {
            message = message.concat(data);
        }

        return new Uint8Array(message);
    }

    static rpn7(channel: number, param: number, value: number)
    {
        const status = MIDIStatus.ControlChange | channel;

        return new Uint8Array([
            status,
            MIDIController.RPN_MSB,
            (param >> 7) & 0x7f,
            status,
            MIDIController.RPN_LSB,
            param & 0x7f,
            status,
            MIDIController.DataEntry_MSB,
            value & 0x7f,
        ]);
    }

    static rpn14(channel: number, param: number, value: number)
    {
        const status = MIDIStatus.ControlChange | channel;

        return new Uint8Array([
            status,
            MIDIController.RPN_MSB,
            (param >> 7) & 0x7f,
            status,
            MIDIController.RPN_LSB,
            param & 0x7f,
            status,
            MIDIController.DataEntry_MSB,
            (value >> 7) & 0x7f,
            status,
            MIDIController.DataEntry_LSB,
            value & 0x7f,
        ]);
    }

    static nrpn7(channel: number, param: number, value: number)
    {
        const status = MIDIStatus.ControlChange | channel;

        return new Uint8Array([
            status,
            MIDIController.NRPN_MSB,
            (param >> 7) & 0x7f,
            status,
            MIDIController.NRPN_LSB,
            param & 0x7f,
            status,
            MIDIController.DataEntry_MSB,
            value & 0x7f,
        ]);
    }

    static nrpn14(channel: number, param: number, value: number)
    {
        const status = MIDIStatus.ControlChange | channel;

        return new Uint8Array([
            status,
            MIDIController.NRPN_MSB,
            (param >> 7) & 0x7f,
            status,
            MIDIController.NRPN_LSB,
            param & 0x7f,
            status,
            MIDIController.DataEntry_MSB,
            (value >> 7) & 0x7f,
            status,
            MIDIController.DataEntry_LSB,
            value & 0x7f,
        ]);
    }

    static rpnNull(channel: number)
    {
        const status = MIDIStatus.ControlChange | channel;

        return new Uint8Array([
            status,
            MIDIController.RPN_MSB,
            0x7f,
            status,
            MIDIController.RPN_LSB,
            0x7f,
        ]);
    }

    static type(firstByte: number): MIDIMessageType
    {
        if (firstByte === 0xf0) {
            return MIDIMessageType.SysEx;
        }
        if ((firstByte & 0xf0) === 0xf0) {
            return MIDIMessageType.System;
        }

        return MIDIMessageType.Channel;
    }

    static status(firstByte: number): MIDIStatus
    {
        if ((firstByte & 0xf0) === 0xf0) {
            return firstByte;
        }

        return firstByte & 0xf0;
    }

    static validateSysEx(
        data: number[] | Uint8Array,
        id: number | number[],
        deviceId?: number,
        header?: number[] | Uint8Array
    ): boolean
    {
        let i = 0;

        // status byte
        if (data[0] !== MIDIStatus.SystemExclusive) {
            return false;
        }
        // manufacturer id (1-byte or extended 3-byte)
        if (typeof id === "number") {
            if (data[1] !== id) {
                return false;
            }
            i = 2;
        }
        else {
            if (data[1] !== id[0] || data[2] !== id[1] || data[3] !== id[2]) {
                return false;
            }
            i = 4;
        }
        // device id (0x7f matches any device)
        if (deviceId !== undefined && deviceId !== 0x7f && data[i] !== deviceId) {
            return false;
        }
        // header (0xff matches any value)
        if (header) {
            for (let j = 0; j < header.length; ++j) {
                if (header[j] !== 0xff && header[j] !== data[i + j + 1]) {
                    return false;
                }
            }
        }

        return true;
    }

    public readonly data: Uint8Array;
    public readonly time: number;

    constructor(event: MIDIMessageEvent);
    constructor(data: Uint8Array, time?: number);
    constructor(dataOrEvent: MIDIMessageEvent | Uint8Array, time?: number)
    {
        if (dataOrEvent instanceof Uint8Array) {
            this.data = dataOrEvent;
            this.time = time || Date.now();
        }
        else {
            this.data = dataOrEvent.data;
            this.time = dataOrEvent.timeStamp || Date.now();
        }

        if (MIDIMessage.convertZeroVelToNoteOff) {
            const data = this.data;
            if (data.length === 3 && (data[0] & 0xf0) === 0x90 && data[2] === 0) {
                data[0] = 0x80 | (data[0] & 0x0f);
            }
        }
    }

    get type(): MIDIMessageType
    {
        return MIDIMessage.type(this.data[0]);
    }

    get status(): MIDIStatus
    {
        return MIDIMessage.status(this.data[0]);
    }

    get statusName(): string
    {
        return MIDIStatus[this.status];
    }

    /** Gets or sets the channel number (zero-based) of a channel message. */
    get channel(): number
    {
        return this.data[0] & 0x0f;
    }
    set channel(channel: number)
    {
        const data = this.data;
        if (data.length > 0) {
            data[0] = (data[0] & 0xf0) | (channel & 0x0f);
        }
    }

    /** Returns the note number of a note message. */
    get note(): MIDINote
    {
        return this.data[1];
    }

    /** Returns the velocity of a note message. */
    get velocity(): number
    {
        return this.data[2];
    }

    /** Returns the controller type of a controller message. */
    get controller(): MIDIController
    {
        return this.data[1];
    }

    /** Returns the value of a controller message. */
    get value(): number
    {
        return this.data[2];
    }

    /** Returns the program number of a program message. */
    get program(): number
    {
        return this.data[1];
    }

    /** Returns the pitch bend amount in the range -8192 to +8191. */
    get pitchBend(): number
    {
        return this.data[2] * 0x80 + this.data[1] - 0x2000;
    }

    get manufacturerId(): number | number[] | undefined
    {
        const d = this.data;
        if (d[0] !== MIDIStatus.SystemExclusive) {
            return undefined;
        }

        if (d[1] === 0) {
            return [ d[1], d[2], d[3] ];
        }

        return d[1];
    }

    get deviceId(): number | undefined
    {
        const d = this.data;
        if (d[0] !== MIDIStatus.SystemExclusive) {
            return undefined;
        }

        if (d[1] === 0) {
            return d[4];
        }

        return d[2];
    }

    validateSysEx(id: number | number[], deviceId?: number, data?: number[] | Uint8Array): boolean
    {
        return MIDIMessage.validateSysEx(this.data, id, deviceId, data);
    }

    toString(): string
    {
        const type = this.type;
        const status = this.status;
        const name = MIDIStatus[status];
        const data = this.data;
        const b1 = data[1];
        const b2 = data[2];

        if (type === MIDIMessageType.Channel) {
            const channel = this.channel + 1;
            switch(status) {
                case MIDIStatus.NoteOn:
                case MIDIStatus.NoteOff:
                    return `${name} (Ch. ${channel}, Note: ${MIDINote[b1]} (${b1}), Velocity: ${b2})`;

                case MIDIStatus.KeyPressure:
                    return `${name} (Ch. ${channel}, Note: ${MIDINote[b1]}, Pressure: ${b2})`;

                case MIDIStatus.ControlChange: {
                    const ccType = b1 < 120 ? "ControlChange" : "ChannelMode";
                    const ccName = MIDIController[b1];
                    return `${ccType} (Ch. ${channel}, Number: ${b1}${ccName ? ` / ${ccName}` : ""}, Value: ${b2})`;
                }
                case MIDIStatus.ProgramChange:
                    return `${name} (Ch. ${channel}, Number: ${b1})`;

                case MIDIStatus.ChannelPressure:
                    return `${name} (Ch. ${channel}, Pressure: ${b1})`;

                case MIDIStatus.PitchBend:
                    return `${name} (Ch. ${channel}, Value: ${this.pitchBend}, LSB: ${b1}, MSB: ${b2})`;

                default:
                    return `${name} (Ch. ${channel}, Values: ${b1}, ${b2})`;
            }
        }
        else if (type === MIDIMessageType.System) {
            switch(status) {
                case MIDIStatus.MTCQuarterFrame:
                    return `${name} (type: ${b1 >> 4}, value: ${b1 & 0x0f})`;

                case MIDIStatus.SongPosition:
                    return `${name} (position: ${b2 * 0x80 + b1})`;

                case MIDIStatus.SongSelect:
                    return `${name} (song: ${b1})`;
                    
                default:
                    return `${name}`;
            }
        }
        else {
            // System Exclusive: print first 64 bytes in rows of 8 bytes
            const parts = [`${name} (length: ${data.length})`];
            for (let i = 0; i < data.length; ++i) {
                if (i % 8 == 0) {
                    parts.push("\n    ");
                }
                if (i === 64) {
                    parts.push("...");
                    break;
                }
                parts.push(("0" + data[i].toString(16) + " ").substr(-3));
            }

            return parts.join("");
        }
    }
}
