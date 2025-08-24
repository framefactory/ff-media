/**
 * FF Typescript Foundation Library
 * Copyright 2025 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import FFT from "fft.js";

import { math } from "@ffweb/core/math.js";
import { Publisher } from "@ffweb/core/Publisher.js";

import { WaveDecoder, FrameData } from "./WaveDecoder.js";

////////////////////////////////////////////////////////////////////////////////

export class WaveProcessor extends Publisher
{
    protected decoder: WaveDecoder;
    protected input: FrameData;
    protected fft: FFT;

    private _frameIndex: number = 0;
    private _samples: Float32Array = null;
    private _spectrum: Float32Array = null;
    private _magnitudes: Float32Array = null;

    constructor()
    {
        super();
        this.addEvents(
            "change-slice"
        );

        this.decoder = new WaveDecoder();
        this.input = null;
    }

    async importFromFile(file: File)
    {
        const data = await this.decoder.decodeFile(file);
        this.input = data.frameData[0];
        this.fft = new FFT(this.input.samplesPerFrame);
        this.frameIndex = 0;
    }

    get samples(): Float32Array {
        return this._samples;
    }
    get spectrum(): Float32Array {
        return this._spectrum;
    }
    get magnitudes(): Float32Array {
        return this._magnitudes;
    }

    get samplesPerFrame(): number {
        return this.input ? this.input.samplesPerFrame : 0;
    }

    get frameCount(): number {
        return this.input ? this.input.numberOfFrames : 0;
    }

    get frameIndex(): number {
        return this._frameIndex;
    }

    set frameIndex(value: number) {
        this._frameIndex = math.limit(value, 0, this.frameCount - 1);
        this._samples = this.input?.frames[this._frameIndex];
        this.calculateSpectrum();
        this.emit("change-slice");
    }

    protected calculateSpectrum()
    {
        const samples = this._samples;
        const fft = this.fft;

        if (!samples || !fft) {
            this._spectrum = null;
            this._magnitudes = null;
            return;
        }

        const n = samples.length;

        const complex = fft.createComplexArray();
        fft.toComplexArray(samples, complex);
        const spectrum = fft.createComplexArray() as any;
        fft.transform(spectrum, complex);
        this._spectrum = Float32Array.from(spectrum);

        // apply cutoff
        // const ns = spectrum.length;
        // const cut = Math.floor(ns / cutoff);
        // for (let i = cut; i < ns - cut; ++i) {
        //     spectrum[i] = 0;
        // }

        const magnitudes = new Float32Array(n / 2);
        for (let i = 0; i < magnitudes.length; ++i) {
            const re = spectrum[i * 2];
            const im = spectrum[i * 2 + 1];
            magnitudes[i] = Math.sqrt(re * re + im * im);
        }
        // convert to dB scale
        for (let i = 0; i < magnitudes.length; ++i) {
            magnitudes[i] = 20 * Math.log10(magnitudes[i] + 1e-6);
        }
        // normalize
        const max = Math.max(...magnitudes);
        if (max > 1e-6) {
            const factor = 1 / max;
            for (let i = 0; i < magnitudes.length; ++i) {
                magnitudes[i] *= factor;
            }
        }
        this._magnitudes = Float32Array.from(magnitudes);

    }
}