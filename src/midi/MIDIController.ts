/**
 * FF Typescript Foundation Library
 * Copyright 2025 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

export enum MIDIController
{
    BankSelect = 0,
    ModulationWheel = 1,
    BreathController = 2,
    FootController = 4,
    PortamentoTime = 5,
    DataEntry_MSB = 6,
    Volume = 7,
    Balance = 8,
    Pan = 10,
    ExpressionController = 11,
    EffectControl1 = 12,
    EffectControl2 = 13,
    GeneralPurposeController1 = 16,
    GeneralPurposeController2 = 17,
    GeneralPurposeController3 = 18,
    GeneralPurposeController4 = 19,

    BankSelect_LSB = 32,
    ModulationWheel_LSB = 33,
    BreathController_LSB = 34,
    FootController_LSB = 36,
    PortamentoTime_LSB = 37,
    DataEntry_LSB = 38,
    Volume_LSB = 39,
    Balance_LSB = 40,
    Pan_LSB = 41,
    ExpressionController_LSB = 43,
    EffectControl1_LSB = 44,
    EffectControl2_LSB = 45,
    GeneralPurposeController1_LSB = 48,
    GeneralPurposeController2_LSB = 49,
    GeneralPurposeController3_LSB = 50,
    GeneralPurposeController4_LSB = 51,

    SustainPedalSwitch = 64,
    PortamentoSwitch = 65,
    SostenutoSwitch = 66,
    SoftPedalSwitch = 67,
    LegatoSwitch = 68,
    Hold2Switch = 69,

    SoundController1 = 70,
    SoundController2 = 71,
    SoundController3 = 72,
    SoundController4 = 73,
    SoundController5 = 74,
    SoundController6 = 75,
    SoundController7 = 76,
    SoundController8 = 77,
    SoundController9 = 78,
    SoundController10 = 79,
    GeneralPurposeController5 = 80,
    GeneralPurposeController6 = 81,
    GeneralPurposeController7 = 82,
    GeneralPurposeController8 = 83,
    PortamentoControl = 84,
    HighResolutionVelocityPrefix = 88,
    EffectsDepth1 = 91,
    EffectsDepth2 = 92,
    EffectsDepth3 = 93,
    EffectsDepth4 = 94,
    EffectsDepth5 = 95,
    DataIncrement = 96,
    DataDecrement = 97,

    NRPN_LSB = 98,
    NRPN_MSB = 99,
    RPN_LSB = 100,
    RPN_MSB = 101,

    // Channel mode messages
    AllSoundOff = 120,
    ResetAllControllers = 121,
    LocalControl = 122,
    AllNotesOff = 123,
    OmniModeOff = 124,
    OmniModeOn = 125,
    MonoModeOn = 126,
    PolyModeOn = 127
}