/**
 * FF Typescript Foundation Library
 * Copyright 2025 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

export enum NRTSubId
{
    Unused                          = 0x00,
    SampleDumpHeader                = 0x01,
    SampleDataPacket                = 0x02,
    SampleDumpRequest               = 0x03,
    MIDITimeCode                    = 0x04,
    SampleDumpExtensions            = 0x05,
    GeneralInformation              = 0x06,
    FileDump                        = 0x07,
    MIDITuningStandard              = 0x08,
    GeneralMIDI                     = 0x09,
    DownloadableSounds              = 0x0a,
    FileReferenceMessage            = 0x0b,
    MIDIVisualControl               = 0x0c,
    MIDICapabilityInquiry           = 0x0d,
    EndOfFile                       = 0x7b,
    Wait                            = 0x7c,
    Cancel                          = 0x7d,
    NAK                             = 0x7e,
    ACK                             = 0x7f,
}

export enum RTSubId
{
    Unused                          = 0x00,
    MIDITimeCode                    = 0x01,
    MIDIShowControl                 = 0x02,
    NotationInformation             = 0x03,
    DeviceControl                   = 0x04,
    RealTimeMTCCueing               = 0x05,
    MIDIMachineControlCommands      = 0x06,
    MIDIMachineControlResponses     = 0x07,
    MIDITuningStandard              = 0x08,
    ControllerDestinationSetting    = 0x09,
    KeyBasedInstrumentControl       = 0x0a,
    ScalablePolyphonyMIDIMIPMessage = 0x0b,
    MobilePhoneControlMessage       = 0x0c,
}
