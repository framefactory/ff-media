/**
 * FF Typescript Foundation Library
 * Copyright 2025 Ralph Wiedemeier, Frame Factory GmbH
 *
 * License: MIT
 */

import FFT from "fft.js";

////////////////////////////////////////////////////////////////////////////////

/**
 * Provides methods to process audio wave data, in particular to calculate
 * the frequency spectrum, and to filter/downsample the spectrum using FFT.
 */
export class WaveProcessor
{
    protected fft: FFT = null;

    constructor()
    {
        this.fft = null;
    }

    /**
     * Calculates the complex spectrum for the given samples using FFT.
     * @param samples Input samples, length must be a power of 2.
     * @returns Complex spectrum as Float32Array of length 2*n,
     * where n is the number of samples.
     */
    getSpectrum(samples: Float32Array): Float32Array
    {
        const n = samples.length;
        let fft = this.fft;

        if (fft?.size !== n) {
            this.fft = fft = new FFT(n);
        }

        const complex = fft.createComplexArray();
        fft.toComplexArray(samples, complex);
        const spectrum = fft.createComplexArray() as any;
        fft.transform(spectrum, complex);

        return Float32Array.from(spectrum);
    }

    /**
     * Calculates the magnitudes in dB scale and normalized to [0..1]
     * from the given complex spectrum.
     * @param spectrum Complex spectrum as returned by `getSpectrum()`.
     * @returns Magnitudes in the range [0..1].
     */
    getMagnitudes(spectrum: Float32Array): Float32Array
    {
        const n = spectrum.length / 2;
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

        // normalize to [0..1]
        const max = Math.max(...magnitudes);
        if (max > 1e-6) {
            const factor = 1 / max;
            for (let i = 0; i < magnitudes.length; ++i) {
                magnitudes[i] *= factor;
            }
        }

        return magnitudes;
    }

    /**
     * Applies inverse FFT to the given complex spectrum and returns
     * the resulting time-domain samples.
     * @param spectrum Complex spectrum as returned by `getSpectrum()`.
     * @returns Time-domain samples as Float32Array.
     */
    getSamples(spectrum: Float32Array): Float32Array
    {
        const fft = this.fft;

        const complex = fft.createComplexArray() as any;
        fft.inverseTransform(complex, spectrum);

        const samples = new Float32Array(spectrum.length / 2);
        fft.fromComplexArray(complex, samples);

        return samples;
    }

    /**
     * Filters the given spectrum by the specified cutoff factor.
     * Sets all frequency components to zero which are within the center
     * part of the spectrum defined by the cutoff factor. Example:
     * A cutoff factor of 4 will leave the lowest 1/4 and the highest 1/4 of
     * the frequency components unchanged and set the middle 1/2 to zero.
     * @param spectrum Complex spectrum as returned by `getSpectrum()`.
     * @param cutoff Cutoff factor, typically 2, 4, 8, ...
     * @returns The filtered spectrum.
     */
    cutSpectrum(spectrum: Float32Array, cutoff: number): Float32Array
    {
        spectrum = Float32Array.from(spectrum);
        const n = spectrum.length;
        const cut = Math.floor(n / cutoff);

        for (let i = cut; i <= n - cut; ++i) {
            spectrum[i] = 0;
        }

        return spectrum;
    }

    /**
     * Downsamples the given samples by the specified factor.
     * @param samples Input samples.
     * @param factor Downsampling factor, typically 2, 4, 8, ...
     * @returns The downsampled samples.
     */
    downsample(samples: Float32Array, factor: number): Float32Array
    {
        const n = Math.floor(samples.length / factor);
        const downsampled = new Float32Array(n);

        for (let i = 0; i < n; ++i) {
            downsampled[i] = samples[i * factor];
        }

        return downsampled;
    }
}