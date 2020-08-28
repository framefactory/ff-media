/**
 * FF Typescript Foundation Library
 * Copyright 2020 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import MIDIDevice, { MIDIMessage } from "./MIDIDevice";

////////////////////////////////////////////////////////////////////////////////

export { MIDIDevice, MIDIMessage };

export interface IExchangeEvent
{
    request: Uint8Array;
    response?: IRequiredResponse | IRequiredResponse[];
}

export interface IRequiredResponse
{
    id?: number | number[];
    deviceId?: number;
    header?: number[] | Uint8Array;
}

export default class MIDIExchange<MIDIDeviceType extends MIDIDevice = MIDIDevice>
{
    public readonly device: MIDIDeviceType;
    public readonly input: WebMidi.MIDIInput;
    public readonly output: WebMidi.MIDIOutput;

    private _isRunning = false;
    private _isCompleted = false;

    private _resolve: (result: this) => void = null;
    private _reject: (error: Error) => void = null;
    private _timeout: number = 5000;
    private _handle: any = null;

    private _exchangeEvents: IExchangeEvent[] = [];
    private _responses: Uint8Array[] = [];

    private _eventIndex = 0;
    private _requiredResponses: Set<IRequiredResponse> = null;


    constructor(device: MIDIDeviceType, exchange?: IExchangeEvent | IExchangeEvent[], msTimeout?: number)
    {
        this.onMidiMessage = this.onMidiMessage.bind(this);

        this.device = device;
        this.input = device.input;
        this.output = device.output;

        if (exchange) {
            this._exchangeEvents = Array.isArray(exchange) ? exchange : [ exchange ];
        }
        if (msTimeout) {
            this._timeout = msTimeout;
        }

        if (!this.input) {
            throw new Error("device has no valid midi input");
        }
        if (!this.output) {
            throw new Error("device has no valid midi output");
        }

        this.input.addEventListener("midimessage", this.onMidiMessage);
    }

    get responses(): Readonly<Uint8Array[]> {
        return this._responses;
    }

    async start(): Promise<this>
    {
        if (this._isRunning) {
            throw new Error("exchange already running");
        }
        if (this._isCompleted) {
            throw new Error("exchange already completed");
        }

        this.exchangeWillStart();

        this._eventIndex = 0;

        if (this._exchangeEvents.length === 0) {
            throw new Error("no exchange events defined");
        }

        return new Promise((resolve, reject) => {

            this._resolve = resolve;
            this._reject = reject;

            this.startExchangeEvent();
        });
    }

    protected resolve()
    {
        this.input.removeEventListener("midimessage", this.onMidiMessage);
        this._resolve(this);
    }

    protected reject(reason: string)
    {
        this.input.removeEventListener("midimessage", this.onMidiMessage);
        this._reject(new Error(reason));
    }

    protected startExchangeEvent()
    {
        const event = this._exchangeEvents[this._eventIndex];
        this.exchangeEventWillStart(event, this._eventIndex);
        const response = event.response;

        if (response) {
            this._requiredResponses = new Set(Array.isArray(response) ? response : [ response ]);
        }
        else {
            this._requiredResponses = null;
        }

        //console.log("[MIDIExchange] request:", new MIDIMessage(event.request, 0).toString());
        //console.log("[MIDIExchange] expected responses:", this._requiredResponses.size);

        this.output.send(event.request);

        this._handle = setTimeout(() => {
            this.reject(`no response, timeout reached after ${this._timeout} milliseconds.`);
        }, this._timeout);
    }

    protected addExchangeEvent(event: IExchangeEvent)
    {
        this._exchangeEvents.push(event);
    }

    protected exchangeWillStart()
    {
    }

    protected exchangeEventWillStart(event: IExchangeEvent, index: number)
    {
    }

    protected exchangeEventDidComplete(event: IExchangeEvent, index: number)
    {
    }

    protected exchangeDidComplete(responses: Uint8Array[]): Uint8Array[]
    {
        return responses;
    }

    protected onMidiMessage(event: WebMidi.MIDIMessageEvent)
    {
        const data = event.data;
        const required = this._requiredResponses;
        let exchangeCompleted = true;

        if (required) {
            for (const req of required) {
                const id = req.id || this.device.manufacturerId;
                const deviceId = req.deviceId || this.device.deviceId;

                if (MIDIMessage.validateSysEx(data, id, deviceId, req.header)) {
                    this._responses.push(data);
                    required.delete(req);
                    break;
                }
            }

            exchangeCompleted = !required.size;
        }
        else {
            this._responses.push(data);
        }

        if (exchangeCompleted) {
            const exchanges = this._exchangeEvents;
            this.exchangeEventDidComplete(exchanges[this._eventIndex], this._eventIndex);

            clearTimeout(this._handle);
            this._handle = null;
            this._eventIndex++;

            if (this._eventIndex >= exchanges.length) {
                this._responses = this.exchangeDidComplete(this._responses);
                return this.resolve();
            }

            this.startExchangeEvent();
        }
    }
}
