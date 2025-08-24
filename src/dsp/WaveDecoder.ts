/**
 * FF Typescript Foundation Library
 * Copyright 2025 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

export type WaveAudioFormat = "pcm" | "float";

export interface WaveFormat
{
    audioFormat: WaveAudioFormat;
    numberOfChannels: number;
    sampleRate: number;
    bytesPerSec: number;
    bytesPerBlock: number;
    bitsPerSample: number;
}

export interface SerumClmFormat
{
    samplesPerFrame: number; // usually 2048
    flags: number;
    type: string; // should be "wavetable"
    origin: string;
    text: string;
}

export interface WaveData
{
    numberOfChannels: number;
    channels: Float32Array[];
}

export interface FrameData
{
    numberOfFrames: number;
    samplesPerFrame: number;
    frames: Float32Array[];
}

export interface WaveAudio
{
    format: WaveFormat;
    clm: SerumClmFormat;
    waveData: WaveData[];
    frameData: FrameData[];
}

export class WaveDecoder
{
    private _format: WaveFormat = null;
    private _clm: SerumClmFormat = null;
    private _waveData: WaveData[] = [];
    private _frameData: FrameData[] = [];

    static async decodeBuffer(buffer: ArrayBuffer): Promise<WaveAudio>
    {
        const decoder = new WaveDecoder();
        return decoder.decodeBuffer(buffer);
    }

    get audioData(): WaveAudio {
        return {
            format: this._format,
            clm: this._clm,
            waveData: this._waveData,
            frameData: this._frameData,
        };
    }

    async decodeFile(file: File): Promise<WaveAudio>
    {
        // extract first number in file name as samplesPerFrame
        const match = file.name.match(/[\d]+/g);
        const samplesPerFrame = match ? parseInt(match[0]) : 0;

        const arrayBuffer = await file.arrayBuffer();
        return this.decodeBuffer(arrayBuffer, samplesPerFrame);
    }

    async decodeBuffer(buffer: ArrayBuffer, samplesPerFrame: number = 0): Promise<WaveAudio>
    {
        samplesPerFrame = this.isPowerOf2(samplesPerFrame) ? samplesPerFrame : 0;

        let chunk = new DataView(buffer);
        const fourCC = this.getFourCC(chunk);
        if (fourCC !== "RIFF") {
            throw new Error(`Invalid container, expected RIFF but found ${fourCC}`);
        }

        const format = this.getFourCC(chunk, 8);
        if (format !== "WAVE") {
            throw new Error(`Invalid format, expected WAVE but found ${format}`);
        }
       
        let offset = 12;

        while (offset < buffer.byteLength) {
            chunk = new DataView(buffer, offset);
            const fourCC = this.getFourCC(chunk);
            const byteLength = this.getByteLength(chunk);
            console.debug(`decoding chunk: ${fourCC}, length: ${byteLength}`);

            switch (fourCC) {
                case "fmt ":
                    if (this._format) {
                        throw new Error("Multiple format chunks found, expected only one");
                    }
                    this._format = this.parseFormatChunk(chunk);
                    break;
                case "clm ":
                    if (this._clm) {
                        throw new Error("Multiple CLM chunks found, expected only one");
                    }
                    this._clm = this.parseSerumClmChunk(chunk);
                    samplesPerFrame = this._clm.samplesPerFrame;
                    break;
                case "data":
                    this.parseDataChunk(chunk);
                    break;
            }

            offset += byteLength;
        }
        const wd = this._waveData;
        if (samplesPerFrame && wd.length === 1 && wd[0]?.numberOfChannels === 1) {
            this.extractFrameData(samplesPerFrame);
        }

        return this.audioData;
    }

    protected parseFormatChunk(chunk: DataView): WaveFormat
    {
        const format: WaveFormat = {
            audioFormat: chunk.getUint16(8, true) === 1 ? "pcm" : "float",
            numberOfChannels: chunk.getUint16(10, true),
            sampleRate: chunk.getUint32(12, true),
            bytesPerSec: chunk.getUint32(16, true),
            bytesPerBlock: chunk.getUint16(20, true),
            bitsPerSample: chunk.getUint16(22, true),
        };

        const bps = format.bitsPerSample / 8;
        if (bps !== Math.abs(bps)) {
            throw new Error(`Invalid number of bits per sample: ${format.bitsPerSample}`);
        }

        console.info(`Audio format: ${format.audioFormat}, ${format.numberOfChannels} channels, ${format.sampleRate} sample rate, ${format.bitsPerSample} bits per sample`);
        return format;
    }

    protected parseSerumClmChunk(chunk: DataView): SerumClmFormat
    {
        const byteLength = this.getByteLength(chunk);
        const slice = new Uint8Array(chunk.buffer, chunk.byteOffset + 8, byteLength - 8);
        const text = new TextDecoder().decode(slice);

        // example: <!>2048 10000000 wavetable (www.xferrecords.com)
        const regex = /<!>(\d+)\s+(\d+)\s+(\S+)\s+(.+)/;
        const match = text.match(regex);
        if (!match) {
            throw new Error(`Invalid Serum CLM chunk format: ${text}`);
        }

        const type = match[3].toLowerCase();
        if (type !== "wavetable") {
            throw new Error(`Unsupported Serum CLM type: ${type}`);
        }

        const clm: SerumClmFormat = {
            text,
            samplesPerFrame: parseInt(match[1]),
            flags: parseInt(match[2], 2),
            type,
            origin: match[4].trim(),
        };

        console.info(`Serum CLM format: ${clm.samplesPerFrame} samples per frame, flags: ${clm.flags}, type: ${clm.type}, origin: ${clm.origin}`);
        return clm;
    }

    protected parseDataChunk(chunk: DataView)
    {
        const format = this._format;
        if (!format) {
            throw new Error("Wave format not defined, cannot parse data chunk");
        }

        const byteLength = this.getByteLength(chunk) - 8;
        const bytesPerSample = format.bitsPerSample / 8;
        const numberOfChannels = format.numberOfChannels;
        const numSamplesPerChannel = byteLength / (bytesPerSample * numberOfChannels);

        const waveData: WaveData = {
            numberOfChannels,
            channels: [],
        }

        for (let i = 0; i < numberOfChannels; i++) {
            const data = new Float32Array(numSamplesPerChannel);

            if (format.audioFormat === "pcm") {
                for (let j = 0; j < numSamplesPerChannel; j++) {
                    const sampleOffset = 8 + (j * numberOfChannels + i) * bytesPerSample;
                    switch(bytesPerSample) {
                        case 1: // 8-bit signed PCM
                            data[j] = chunk.getInt8(sampleOffset) / (1 << 7);
                            break;
                        case 2: // 16-bit signed PCM
                            data[j] = chunk.getInt16(sampleOffset, true) / (1 << 15);
                            break;
                        case 4: // 32-bit signed PCM
                            data[j] = chunk.getInt32(sampleOffset, true) / (1 << 31);
                            break;
                        default:
                            throw new Error(`Unsupported bytes per sample: ${bytesPerSample}`);
                    }
                }
            }
            else if (format.audioFormat === "float") {
                for (let j = 0; j < numSamplesPerChannel; j++) {
                    const sampleOffset = 8 + (j * numberOfChannels + i) * 4;
                    data[j] = chunk.getFloat32(sampleOffset, true);
                }
            }

            waveData.channels.push(data);
        }

        this._waveData.push(waveData);
    }

    protected extractFrameData(samplesPerFrame: number)
    {
        const data = this._waveData[0].channels[0];
        const numSamples = data.length;
        const numFrames = numSamples / samplesPerFrame;

        if (numFrames > 1024 || numFrames !== Math.abs(numFrames)) {
            throw new Error(`Invalid number of frames: ${numFrames}`);
        }

        const frameData: FrameData = {
            numberOfFrames: numFrames,
            samplesPerFrame,
            frames: [],
        };

        for (let j = 0; j < numFrames; j++) {
            const frameOffset = j * samplesPerFrame;
            const frame = data.subarray(frameOffset, frameOffset + samplesPerFrame);
            frameData.frames.push(frame);
        }

        this._frameData.push(frameData);
        console.info(`Wavetable: ${numFrames} frames, ${samplesPerFrame} samples per frame`);
    }

    protected getByteLength(chunk: DataView): number
    {
        return chunk.getUint32(4, true) + 8; // including header
    }

    protected getFourCC(chunk: DataView, offset: number = 0): string
    {
        const slice = new Uint8Array(chunk.buffer, chunk.byteOffset + offset, 4);
        return String.fromCharCode(...slice);
    }

    protected isPowerOf2(v: number)
    {
        return v > 0 && (v & (v - 1)) === 0;
    }
}