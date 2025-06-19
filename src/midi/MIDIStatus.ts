/**
 * FF Typescript Foundation Library
 * Copyright 2025 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

export enum MIDIStatus
{
    NoteOff         = 0b10000000, // 0x80, 128
    NoteOn          = 0b10010000, // 0x90, 144
    KeyPressure     = 0b10100000,
    ControlChange   = 0b10110000,
    ProgramChange   = 0b11000000,
    ChannelPressure = 0b11010000,
    PitchBend       = 0b11100000,

    SystemCommon    = 0b11110000,
    SystemExclusive = 0b11110000,
    MTCQuarterFrame = 0b11110001,
    SongPosition    = 0b11110010,
    SongSelect      = 0b11110011,
    TuneRequest     = 0b11110110,
    EndOfExclusive  = 0b11110111,

    SystemRealtime  = 0b11111000,
    TimingClock     = 0b11111000,
    Start           = 0b11111010,
    Continue        = 0b11111011,
    Stop            = 0b11111100,
    ActiveSensing   = 0b11111110,
    Reset           = 0b11111111,
}
