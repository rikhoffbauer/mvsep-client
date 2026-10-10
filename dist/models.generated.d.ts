export declare const generatedModels: {
    readonly EnsembleVocalsInstrum: {
        readonly id: 26;
        readonly name: "Ensemble (vocals, instrum)";
        readonly active: true;
        readonly group: "Ensembles";
        readonly groupId: 23;
        readonly widget: "single_upload";
        readonly stems: readonly ["vocals", "other"];
        readonly priceCoefficient: 2;
        readonly rating: {
            readonly average: 3.5;
            readonly total: 22;
        };
        readonly fields: readonly [{
            readonly name: "add_opt2";
            readonly text: "Model Type";
            readonly serverKey: "model_type";
            readonly defaultKey: "7";
            readonly choices: {
                readonly "1": "SDR Vocals 10.44 (MDX23C, VitLarge23, Demucs4HT)";
                readonly "2": "SDR Vocals 10.75 (MDX23C, BS Roformer (v1), VitLarge23)";
                readonly "3": "SDR Vocals 11.06 (MDX23C, BS Roformer (viperx))";
                readonly "4": "SDR Vocals 11.33 (MDX23C, BS Roformer (finetuned))";
                readonly "5": "SDR Vocals 11.50 (Mel Roformer and BS Roformer)";
                readonly "6": "SDR Vocals 11.61 (Mel Roformer, BS Roformer and SCNet XL)";
                readonly "7": "SDR Vocals 11.93 (Mel Roformer, BS Roformer (x2) and SCNet XL IHF)";
                readonly "8": "High Vocal Fullness (SDR: 11.69, Fullness: 20.46)";
                readonly "9": "High Instrumental Fullness  (SDR: 17.69, Fullness: 34.79)";
            };
        }, {
            readonly name: "add_opt1";
            readonly text: "Output files";
            readonly serverKey: "detailed";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Standard set";
                readonly "1": "Include intermediate results and max_fft, min_fft";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly model_type: "7";
            };
            readonly stems: readonly ["other", "vocals"];
        }, {
            readonly match: {
                readonly model_type: "9";
            };
            readonly stems: readonly ["other", "vocals"];
        }, {
            readonly match: {
                readonly model_type: "8";
            };
            readonly stems: readonly ["other", "vocals"];
        }];
    };
    readonly EnsembleVocalsInstrumBassDrumsOther: {
        readonly id: 28;
        readonly name: "Ensemble (vocals, instrum, bass, drums, other)";
        readonly active: true;
        readonly group: "Ensembles";
        readonly groupId: 23;
        readonly widget: "single_upload";
        readonly stems: readonly ["vocals", "instrum", "bass", "drums", "other", "piano", "guitar", "bass-bsroformer-sw", "bass-scnet-xl", "drums-bsroformer-sw", "drums-melroformer", "drums-scnet", "instrum-bs-roformer-v1", "instrum-bs-roformer-v2", "instrum-max-fft", "instrum-mel-roformer", "instrum-min-fft", "instrum-scnet-xl-ihf", "vocals-bs-roformer-v1", "vocals-bs-roformer-v2", "vocals-bsroformer-sw", "vocals-max-fft", "vocals-mel-roformer", "vocals-min-fft", "vocals-scnet-xl-ihf"];
        readonly priceCoefficient: 4;
        readonly rating: {
            readonly average: 4.3333;
            readonly total: 6;
        };
        readonly fields: readonly [{
            readonly name: "add_opt2";
            readonly text: "Model Type";
            readonly serverKey: "model_type";
            readonly defaultKey: "11";
            readonly choices: {
                readonly "1": "SDR average: 11.21 (v. 2023.09.01)";
                readonly "2": "SDR average: 11.87 (v. 2024.03.08)";
                readonly "3": "SDR average: 12.03 (v. 2024.03.28)";
                readonly "4": "SDR average: 12.17 (v. 2024.04.04)";
                readonly "5": "SDR average: 12.34 (v. 2024.05.21)";
                readonly "6": "SDR average: 12.66 (v. 2024.07.14)";
                readonly "7": "SDR average: 12.76 (v. 2024.08.15)";
                readonly "8": "SDR average: 12.84 (v. 2024.10.08)";
                readonly "9": "SDR average: 13.01 (v. 2024.12.20)";
                readonly "10": "SDR average: 13.07 (v. 2024.12.28)";
                readonly "11": "SDR average: 13.67 (v. 2025.06.30)";
            };
        }, {
            readonly name: "add_opt1";
            readonly text: "Output files";
            readonly serverKey: "detailed";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Standard set";
                readonly "1": "Include intermediate results and max_fft, min_fft";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly detailed: "0";
            };
            readonly stems: readonly ["bass", "drums", "guitar", "instrum", "other", "piano", "vocals"];
        }, {
            readonly match: {
                readonly detailed: "1";
            };
            readonly stems: readonly ["bass", "bass-bsroformer-sw", "bass-scnet-xl", "drums", "drums-bsroformer-sw", "drums-melroformer", "drums-scnet", "guitar", "instrum", "instrum-bs-roformer-v1", "instrum-bs-roformer-v2", "instrum-max-fft", "instrum-mel-roformer", "instrum-min-fft", "instrum-scnet-xl-ihf", "other", "piano", "vocals", "vocals-bs-roformer-v1", "vocals-bs-roformer-v2", "vocals-bsroformer-sw", "vocals-max-fft", "vocals-mel-roformer", "vocals-min-fft", "vocals-scnet-xl-ihf"];
        }];
    };
    readonly EnsembleAllIn: {
        readonly id: 30;
        readonly name: "Ensemble All-In (vocals, bass, drums, piano, guitar, lead/back vocals, other)";
        readonly active: true;
        readonly group: "Ensembles";
        readonly groupId: 23;
        readonly widget: "single_upload";
        readonly stems: readonly ["vocals", "instrum", "bass", "drums", "guitar", "piano", "strings", "wind", "other-no-vocals-bass-drums", "vocals-lead-v1", "vocals-lead-v2", "vocals-back", "back-instrum", "drums-kick", "drums-snare", "drums-cymbals", "drums-toms", "drums-hh", "drums-ride", "drums-crash"];
        readonly priceCoefficient: 6;
        readonly rating: {
            readonly average: 3.3077;
            readonly total: 13;
        };
        readonly fields: readonly [{
            readonly name: "add_opt2";
            readonly text: "Model Type";
            readonly serverKey: "model_type";
            readonly defaultKey: "11";
            readonly choices: {
                readonly "1": "SDR average: 11.21 (v. 2023.09.01)";
                readonly "2": "SDR average: 11.87 (v. 2024.03.08)";
                readonly "3": "SDR average: 12.03 (v. 2024.03.28)";
                readonly "4": "SDR average: 12.17 (v. 2024.04.04)";
                readonly "5": "SDR average: 12.32 (v. 2024.05.21)";
                readonly "6": "SDR average: 12.66 (v. 2024.07.14)";
                readonly "7": "SDR average: 12.76 (v. 2024.08.15)";
                readonly "8": "SDR average: 12.84 (v. 2024.10.08)";
                readonly "9": "SDR average: 13.01 (v. 2024.12.20)";
                readonly "10": "SDR average: 13.07 (v. 2024.12.28)";
                readonly "11": "SDR average: 13.67 (v. 2025.06.30)";
            };
        }, {
            readonly name: "add_opt1";
            readonly text: "Output files";
            readonly serverKey: "detailed";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Standard set";
                readonly "1": "Include intermediate results and max_fft, min_fft";
            };
        }];
    };
    readonly BSRoformerSW: {
        readonly id: 63;
        readonly name: "BS Roformer SW (vocals, bass, drums, guitar, piano, other)";
        readonly active: true;
        readonly group: "Multistem";
        readonly groupId: 22;
        readonly widget: "single_upload";
        readonly stems: readonly ["vocals", "bass", "drums", "guitar", "piano", "other", "instrum"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.7279;
            readonly total: 937;
        };
    };
    readonly Demucs4_HT: {
        readonly id: 20;
        readonly name: "Demucs4 HT (vocals, drums, bass, other)";
        readonly active: true;
        readonly group: "Multistem";
        readonly groupId: 22;
        readonly widget: "single_upload";
        readonly stems: readonly ["vocals", "drums", "bass", "other", "instrumental", "guitar", "piano"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.6389;
            readonly total: 36;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "1";
            readonly choices: {
                readonly "0": "htdemucs_ft (High Quality, Slow)";
                readonly "1": "htdemucs (Good Quality, Fast)";
                readonly "2": "htdemucs_6s (6 stems, additional piano and guitar)";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly model_type: "0";
            };
            readonly stems: readonly ["bass", "drums", "instrumental", "other", "vocals"];
        }, {
            readonly match: {
                readonly model_type: "1";
            };
            readonly stems: readonly ["bass", "drums", "instrumental", "other", "vocals"];
        }, {
            readonly match: {
                readonly model_type: "2";
            };
            readonly stems: readonly ["bass", "drums", "guitar", "instrumental", "other", "piano", "vocals"];
        }];
    };
    readonly BSRoformer: {
        readonly id: 40;
        readonly name: "BS Roformer (vocals, instrumental)";
        readonly active: true;
        readonly group: "Vocals / Instrumental";
        readonly groupId: 21;
        readonly widget: "single_upload";
        readonly stems: readonly ["vocals", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.5229;
            readonly total: 262;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Vocal model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "81";
            readonly choices: {
                readonly "3": "ver. 2024.02 (SDR vocals: 10.42, SDR instrum: 16.73)";
                readonly "4": "viperx edition (SDR vocals: 10.87, SDR instrum: 17.17)";
                readonly "5": "ver 2024.04 (SDR vocals: 11.24, SDR instrum: 17.55)";
                readonly "29": "ver 2024.08 (SDR vocals: 11.31, SDR instrum: 17.62)";
                readonly "81": "ver 2025.07 (SDR vocals: 11.89, SDR instrum: 18.20)";
                readonly "85": "unwa high instrum fullness (SDR instrum: 17.25)";
                readonly "142": "unwa BS Roformer HyperACE v2 instrum (SDR instrum: 17.40)";
                readonly "143": "unwa  BS Roformer HyperACE v2 vocals (SDR vocals: 11.39)";
                readonly "171": "124 bands (SDR vocals: 12.33, SDR instrum: 18.64)";
                readonly "172": "becruily high instrum fullness 124 bands (SDR instrum: 18.47)";
            };
        }, {
            readonly name: "add_opt2";
            readonly text: "Overlap";
            readonly serverKey: "overlap";
            readonly defaultKey: "2";
            readonly choices: {
                readonly "2": "50%";
                readonly "8": "87.5%";
            };
        }, {
            readonly name: "add_opt3";
            readonly text: "Set of stems";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Standard";
                readonly "1": "Include fullness stems";
            };
        }];
    };
    readonly BSPolarFormer: {
        readonly id: 123;
        readonly name: "BS PolarFormer (vocals, instrumental)";
        readonly active: true;
        readonly group: "Vocals / Instrumental";
        readonly groupId: 21;
        readonly widget: "single_upload";
        readonly stems: readonly ["instrumental", "instrumental-fullness-level-1", "vocals", "vocals-fullness-level-1", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.8182;
            readonly total: 11;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "163";
            readonly choices: {
                readonly "158": "BS PolarFormer (62 bands, SDR: 11.75)";
                readonly "163": "BS PolarFormer (124 bands, SDR: 12.02)";
            };
        }, {
            readonly name: "add_opt2";
            readonly text: "Overlap";
            readonly serverKey: "overlap";
            readonly defaultKey: "2";
            readonly choices: {
                readonly "2": "50%";
                readonly "8": "87.5%";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly model_type: "163";
            };
            readonly stems: readonly ["instrumental", "instrumental-fullness-level-1", "vocals", "vocals-fullness-level-1"];
        }, {
            readonly match: {
                readonly model_type: "158";
            };
            readonly stems: readonly ["other", "vocals"];
        }];
    };
    readonly MelBandRoformer: {
        readonly id: 48;
        readonly name: "MelBand Roformer (vocals, instrumental)";
        readonly active: true;
        readonly group: "Vocals / Instrumental";
        readonly groupId: 21;
        readonly widget: "single_upload";
        readonly stems: readonly ["vocals", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.5745;
            readonly total: 141;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Vocal model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "4";
            readonly choices: {
                readonly "0": "Kimberley Jensen edition (SDR vocals: 11.01, SDR instrum: 17.32)";
                readonly "1": "ver 2024.08 (SDR vocals: 11.17, SDR instrum: 17.48)";
                readonly "2": "Bas Curtiz edition (SDR vocals: 11.18, SDR instrum: 17.49)";
                readonly "3": "unwa Instrumental v1 (SDR vocals: 10.24, SDR instrum: 16.54)";
                readonly "4": "ver 2024.10 (SDR vocals: 11.28, SDR instrum: 17.59)";
                readonly "5": "unwa Instrumental v1e (SDR vocals: 10.05, SDR instrum: 16.36)";
                readonly "6": "unwa big beta v5e (SDR vocals: 10.59, SDR instrum: 16.89)";
                readonly "7": "becruily instrum high fullness (SDR instrum: 16.47)";
                readonly "8": "becruily vocals high fullness (SDR vocals: 10.55)";
                readonly "9": "unwa Instrumental v1e plus (SDR vocals: 10.33, SDR instrum: 16.64)";
                readonly "10": "gabox Instrumental v7 (SDR vocals: 10.32, SDR instrum: 16.63)";
                readonly "11": "becruily deux (SDR vocals: 11.35, SDR instrum: 17.66)";
                readonly "12": "gabox v10 flowers (SDR vocals: 10.67, SDR instrum: 16.97)";
            };
        }, {
            readonly name: "add_opt2";
            readonly text: "Overlap";
            readonly serverKey: "overlap";
            readonly defaultKey: "2";
            readonly choices: {
                readonly "2": "50%";
                readonly "8": "87.5%";
            };
        }];
    };
    readonly MDX23C: {
        readonly id: 25;
        readonly name: "MDX23C (vocals, instrumental)";
        readonly active: true;
        readonly group: "Vocals / Instrumental";
        readonly groupId: 21;
        readonly widget: "single_upload";
        readonly stems: readonly ["vocals", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.5;
            readonly total: 16;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Vocal model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "7";
            readonly choices: {
                readonly "0": "12K FFT (SDR vocals: 9.68, SDR instrum: 15.99)";
                readonly "1": "12K FFT, 6 Poolings (SDR vocals: 9.49, SDR instrum: 15.79)";
                readonly "2": "12K FFT, Large Conv (SDR vocals: 9.71, SDR instrum: 16.02)";
                readonly "3": "12K FFT, Large Conv, Hop 1024 (SDR vocals: 9.95, SDR instrum: 16.26)";
                readonly "4": "8K FFT (SDR vocals: 10.17, SDR instrum: 16.48)";
                readonly "7": "8K FFT (SDR vocals: 10.36, SDR instrum: 16.66)";
            };
        }];
    };
    readonly SCNet: {
        readonly id: 46;
        readonly name: "SCNet (vocals, instrumental)";
        readonly active: true;
        readonly group: "Vocals / Instrumental";
        readonly groupId: 21;
        readonly widget: "single_upload";
        readonly stems: readonly ["vocals", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.5833;
            readonly total: 12;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Vocal model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "5";
            readonly choices: {
                readonly "0": "SCNet (SDR vocals: 10.25, SDR instrum: 16.56)";
                readonly "1": "SCNet Large (SDR vocals: 10.74, SDR instrum: 17.05)";
                readonly "2": "SCNet XL (SDR vocals: 10.96, SDR instrum: 17.27)";
                readonly "3": "SCNet XL (high fullness)";
                readonly "4": "SCNet XL (very high fullness)";
                readonly "5": "SCNet XL IHF (SDR vocals: 11.11, SDR instrum: 17.41)";
                readonly "6": "SCNet XL IHF (high instrum fullness by becruily)";
            };
        }];
    };
    readonly MDXB: {
        readonly id: 23;
        readonly name: "MDX B (vocals, instrumental)";
        readonly active: true;
        readonly group: "Vocals / Instrumental";
        readonly groupId: 21;
        readonly widget: "single_upload";
        readonly stems: readonly ["vocals", "instrum"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.25;
            readonly total: 8;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Vocal model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "11";
            readonly choices: {
                readonly "0": "MDX UVR 2022.01.01 (SDR: 8.83)";
                readonly "1": "MDX UVR 2022.07.25(SDR: 8.67)";
                readonly "2": "MDX Kimberley Jensen v1 2023.02.12  (SDR: 9.48)";
                readonly "4": "UVR-MDX-NET-Inst_HQ_2 (SDR: 9.12)";
                readonly "5": "UVR_MDXNET_Main (SDR: 8.79)";
                readonly "6": "MDX Kimberley Jensen Inst (SDR: 9.28)";
                readonly "7": "MDX Kimberley Jensen v2 2023.05.21 (SDR: 9.60)";
                readonly "8": "UVR-MDX-NET-Inst_HQ_3 (SDR: 9.38)";
                readonly "9": "UVR-MDX-NET-Voc_FT (SDR: 9.64)";
                readonly "11": "UVR-MDX-NET-Inst_HQ_4 (SDR: 9.71)";
                readonly "12": "UVR-MDX-NET-Inst_HQ_5 (SDR: 9.45)";
            };
        }];
    };
    readonly UltimateVocalRemoverVR: {
        readonly id: 9;
        readonly name: "Ultimate Vocal Remover VR (vocals, music)";
        readonly active: true;
        readonly group: "Vocals / Instrumental";
        readonly groupId: 21;
        readonly widget: "single_upload";
        readonly stems: readonly ["vocals", "instruments", "other", "vocalsback", "drums"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 3.6154;
            readonly total: 13;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Model Type";
            readonly serverKey: "model_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "HP2-4BAND-3090_4band_arch-500m_1";
                readonly "1": "HP2-4BAND-3090_4band_2";
                readonly "2": "HP2-4BAND-3090_4band_1";
                readonly "3": "HP_4BAND_3090";
                readonly "4": "Vocal_HP_4BAND_3090";
                readonly "5": "Vocal_HP_4BAND_3090_AGG";
                readonly "6": "HP2-MAIN-MSB2-3BAND-3090";
                readonly "7": "HP-4BAND-V2";
                readonly "8": "HP-KAROKEE-MSB2-3BAND-3090 (Karaokee model)";
                readonly "9": "WIP-Piano-4band-129605kb (Piano model)";
                readonly "10": "drums-4BAND-3090_4band (Drums model)";
                readonly "11": "bass-4BAND-3090_4band (Bass model)";
                readonly "12": "karokee_4band_v2_sn (Karaokee model v2)";
                readonly "13": "UVR-De-Echo-Aggressive";
                readonly "14": "UVR-De-Echo-Normal";
                readonly "15": "UVR-DeNoise";
                readonly "16": "UVR-DeEcho-DeReverb";
                readonly "17": "UVR-BVE-4B_SN-44100-1 (Back vocals model)";
            };
        }, {
            readonly name: "add_opt2";
            readonly text: "Agressiveness";
            readonly serverKey: "agg";
            readonly defaultKey: "0.3";
            readonly choices: {
                readonly "0.3": "0.3";
                readonly "0.1": "0.1";
                readonly "0.2": "0.2";
                readonly "0.4": "0.4";
                readonly "0.5": "0.5";
                readonly "0.6": "0.6";
                readonly "0.7": "0.7";
                readonly "0.8": "0.8";
                readonly "0.9": "0.9";
                readonly "1.0": "1.0";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly model_type: "0";
            };
            readonly stems: readonly ["instruments", "vocals"];
        }, {
            readonly match: {
                readonly model_type: "16";
            };
            readonly stems: readonly ["instruments", "vocals"];
        }, {
            readonly match: {
                readonly model_type: "14";
            };
            readonly stems: readonly ["instruments", "vocals"];
        }, {
            readonly match: {
                readonly model_type: "15";
            };
            readonly stems: readonly ["instruments", "vocals"];
        }, {
            readonly match: {
                readonly model_type: "13";
            };
            readonly stems: readonly ["instruments", "vocals"];
        }, {
            readonly match: {
                readonly model_type: "17";
            };
            readonly stems: readonly ["other", "vocalsback"];
        }, {
            readonly match: {
                readonly model_type: "12";
            };
            readonly stems: readonly ["instruments", "vocals"];
        }, {
            readonly match: {
                readonly model_type: "10";
            };
            readonly stems: readonly ["drums", "other"];
        }, {
            readonly match: {
                readonly model_type: "8";
            };
            readonly stems: readonly ["instruments", "vocals"];
        }, {
            readonly match: {
                readonly model_type: "4";
            };
            readonly stems: readonly ["instruments", "vocals"];
        }];
    };
    readonly Demucs4Vocals2023: {
        readonly id: 27;
        readonly name: "Demucs4 Vocals 2023 (vocals, instrum)";
        readonly active: true;
        readonly group: "Vocals / Instrumental";
        readonly groupId: 21;
        readonly widget: "single_upload";
        readonly stems: readonly ["vocals", "instrumental"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 2;
            readonly total: 1;
        };
    };
    readonly MVSepKaraoke: {
        readonly id: 49;
        readonly name: "MVSep Karaoke (lead/back vocals)";
        readonly active: true;
        readonly group: "Vocals / Instrumental";
        readonly groupId: 21;
        readonly widget: "single_upload";
        readonly stems: readonly ["vocals-lead", "vocals-back", "instrum-only", "back-instrum", "vocals-full"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.7778;
            readonly total: 342;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Karaoke model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "6";
            readonly choices: {
                readonly "0": "Model by viperx and aufr33 (SDR: 9.45)";
                readonly "1": "Model by becruily (SDR: 9.61)";
                readonly "2": "Model by gabox (SDR: 9.67)";
                readonly "3": "Model fuzed gabox & aufr33/viperx (SDR: 9.85)";
                readonly "4": "SCNet XL IHF by becruily (SDR: 9.53)";
                readonly "5": "BS Roformer by frazer and becruily (SDR: 10.11)";
                readonly "6": "BS Roformer by MVSep Team (SDR: 10.41)";
                readonly "7": "BS Roformer by anvuew (SDR: 10.22)";
            };
        }, {
            readonly name: "add_opt2";
            readonly text: "Extraction type";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Use as is";
                readonly "1": "Extract vocals first";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly model_type: "6";
                readonly extract_type: "0";
            };
            readonly stems: readonly ["back-instrum", "instrum-only", "vocals-back", "vocals-lead"];
        }, {
            readonly match: {
                readonly model_type: "6";
                readonly extract_type: "1";
            };
            readonly stems: readonly ["back-instrum", "instrum-only", "vocals-back", "vocals-full", "vocals-lead"];
        }, {
            readonly match: {
                readonly model_type: "7";
                readonly extract_type: "0";
            };
            readonly stems: readonly ["back-instrum", "vocals-lead"];
        }, {
            readonly match: {
                readonly model_type: "3";
                readonly extract_type: "0";
            };
            readonly stems: readonly ["back-instrum", "vocals-lead"];
        }, {
            readonly match: {
                readonly model_type: "0";
                readonly extract_type: "0";
            };
            readonly stems: readonly ["back-instrum", "vocals-lead"];
        }, {
            readonly match: {
                readonly model_type: "5";
                readonly extract_type: "1";
            };
            readonly stems: readonly ["back-instrum", "instrum-only", "vocals-back", "vocals-full", "vocals-lead"];
        }];
    };
    readonly MDXBKaraoke: {
        readonly id: 12;
        readonly name: "MDX-B Karaoke (lead/back vocals)";
        readonly active: true;
        readonly group: "Vocals / Instrumental";
        readonly groupId: 21;
        readonly widget: "single_upload";
        readonly stems: readonly ["vocalslead", "instrum", "instrumonly", "vocalsback", "vocalsfull"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.2667;
            readonly total: 15;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Karaoke model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Extract directly from mixture (SDR lead vocals: 6.81)";
                readonly "1": "Extract from vocals part (SDR lead vocals: 7.94)";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly model_type: "0";
            };
            readonly stems: readonly ["instrum", "vocalslead"];
        }, {
            readonly match: {
                readonly model_type: "1";
            };
            readonly stems: readonly ["instrum", "instrumonly", "vocalsback", "vocalsfull", "vocalslead"];
        }];
    };
    readonly MVSepCrowdRemoval: {
        readonly id: 34;
        readonly name: "MVSep Crowd removal (crowd, other)";
        readonly active: true;
        readonly group: "Vocals / Instrumental";
        readonly groupId: 21;
        readonly widget: "single_upload";
        readonly stems: readonly ["crowd", "other", "crowd-mdx23c", "crowd-melroformer"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.15;
            readonly total: 40;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "2";
            readonly choices: {
                readonly "0": "Mel Roformer (SDR crowd: 6.07)";
                readonly "1": "Ensemble MDX23C + Mel Roformer (SDR crowd: 6.27)";
                readonly "2": "BS Roformer (SDR crowd: 7.21)";
                readonly "8": "MDX23C v1 (SDR crowd: 5.57)";
                readonly "9": "MDX23C v2 (SDR crowd: 6.06)";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly model_type: "2";
            };
            readonly stems: readonly ["crowd", "other"];
        }, {
            readonly match: {
                readonly model_type: "1";
            };
            readonly stems: readonly ["crowd", "crowd-mdx23c", "crowd-melroformer", "other"];
        }, {
            readonly match: {
                readonly model_type: "0";
            };
            readonly stems: readonly ["crowd", "other"];
        }, {
            readonly match: {
                readonly model_type: "8";
            };
            readonly stems: readonly ["crowd", "other"];
        }];
    };
    readonly MedleyVox: {
        readonly id: 53;
        readonly name: "Medley Vox (Multi-singer separation)";
        readonly active: true;
        readonly group: "Vocals / Instrumental";
        readonly groupId: 21;
        readonly widget: "single_upload";
        readonly stems: readonly ["vocals1", "vocals2"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 3.3333;
            readonly total: 27;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "1";
            readonly choices: {
                readonly "0": "Apply to original file";
                readonly "1": "Extract vocals first";
            };
        }];
    };
    readonly MVSepMultichannelBS: {
        readonly id: 43;
        readonly name: "MVSep Multichannel BS (vocals, instrumental)";
        readonly active: true;
        readonly group: "Vocals / Instrumental";
        readonly groupId: 21;
        readonly widget: "single_upload";
        readonly stems: readonly ["vocals", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.3333;
            readonly total: 3;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Model Type";
            readonly serverKey: "model_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "BS Roformer (SDR: 11.89)";
                readonly "1": "MDX23C (SDR: 10.36)";
                readonly "2": "MelBand Roformer (SDR: 11.17)";
                readonly "3": "MelBand Roformer XL (SDR: 11.28)";
                readonly "4": "BS Roformer 124 bands (SDR: 12.33)";
            };
        }, {
            readonly name: "add_opt2";
            readonly text: "Processing Mode";
            readonly serverKey: "extract_type";
            readonly defaultKey: "1";
            readonly choices: {
                readonly "0": "Per-Channel";
                readonly "1": "Stereo Pairs";
            };
        }];
    };
    readonly MVSepMaleFemaleSeparation: {
        readonly id: 57;
        readonly name: "MVSep Male/Female separation";
        readonly active: true;
        readonly group: "Vocals / Instrumental";
        readonly groupId: 21;
        readonly widget: "single_upload";
        readonly stems: readonly ["male", "female", "instrumental", "instrumental-plus-female", "instrumental-plus-male", "vocals"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 3.0196;
            readonly total: 51;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "2";
            readonly choices: {
                readonly "0": "BSRoformer by Sucial (SDR: 6.52)";
                readonly "1": "SCNet XL (SDR: 11.83)";
                readonly "2": "MelRoformer (2025.01) (SDR: 13.03)";
                readonly "3": "BSRoformer by aufr33 (SDR: 8.18)";
            };
        }, {
            readonly name: "add_opt2";
            readonly text: "How to extract";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Extract directly from mixture";
                readonly "1": "Extract vocals first with BS Roformer";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly extract_type: "0";
            };
            readonly stems: readonly ["female", "male"];
        }, {
            readonly match: {
                readonly extract_type: "1";
            };
            readonly stems: readonly ["female", "instrumental", "instrumental-plus-female", "instrumental-plus-male", "male", "vocals"];
        }];
    };
    readonly MVSepChoir: {
        readonly id: 112;
        readonly name: "MVSep Choir (choir, other)";
        readonly active: true;
        readonly group: "Vocals / Instrumental";
        readonly groupId: 21;
        readonly widget: "single_upload";
        readonly stems: readonly ["choir", "other", "instrum", "other-vocals", "vocals"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.5;
            readonly total: 10;
        };
        readonly fields: readonly [{
            readonly name: "add_opt2";
            readonly text: "How to extract";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Extract directly from mixture";
                readonly "1": "Extract vocals first";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly extract_type: "0";
            };
            readonly stems: readonly ["choir", "other"];
        }, {
            readonly match: {
                readonly extract_type: "1";
            };
            readonly stems: readonly ["choir", "instrum", "other-vocals", "vocals"];
        }];
    };
    readonly MVSepSATBChoir: {
        readonly id: 111;
        readonly name: "MVSep SATB Choir (soprano, alto, tenor, bass)";
        readonly active: true;
        readonly group: "Vocals / Instrumental";
        readonly groupId: 21;
        readonly widget: "single_upload";
        readonly stems: readonly ["soprano", "alto", "tenor", "bass", "instrum", "vocals"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.4286;
            readonly total: 21;
        };
        readonly fields: readonly [{
            readonly name: "add_opt2";
            readonly text: "How to extract";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Extract directly from mixture";
                readonly "1": "Extract vocals first";
            };
        }, {
            readonly name: "add_opt1";
            readonly text: "Model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "3";
            readonly choices: {
                readonly "2": "SCNet Masked (SDR: 4.07)";
                readonly "3": "BS Roformer (SDR: 7.39)";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly extract_type: "0";
            };
            readonly stems: readonly ["alto", "bass", "soprano", "tenor"];
        }, {
            readonly match: {
                readonly extract_type: "1";
            };
            readonly stems: readonly ["alto", "bass", "instrum", "soprano", "tenor", "vocals"];
        }];
    };
    readonly MVSepDrums: {
        readonly id: 44;
        readonly name: "MVSep Drums (drums, other)";
        readonly active: true;
        readonly group: "Drums, Bass and Synth";
        readonly groupId: 20;
        readonly widget: "single_upload";
        readonly stems: readonly ["drums", "other", "vocals", "drums-bsroformer-sw", "drums-melroformer", "drums-scnet"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.5833;
            readonly total: 48;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Drums model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "6";
            readonly choices: {
                readonly "0": "HTDemucs (SDR drums: 12.04)";
                readonly "1": "MelBand Roformer (SDR drums: 12.76)";
                readonly "2": "SCNet Large (SDR drums: 13.01)";
                readonly "3": "SCNet XL (SDR drums: 13.42)";
                readonly "4": "Mel + SCNet XL (SDR drums: 13.78)";
                readonly "5": "BS Roformer SW (SDR drums: 14.11)";
                readonly "6": "Mel + SCNet XL + BS Roformer SW (SDR drums: 14.35)";
            };
        }, {
            readonly name: "add_opt2";
            readonly text: "How to extract";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Extract directly from mixture";
                readonly "1": "Extract from instrumental part";
            };
        }, {
            readonly name: "add_opt3";
            readonly text: "Output files";
            readonly serverKey: "detailed";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Standard set";
                readonly "1": "Include results of independent models";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly extract_type: "0";
                readonly detailed: "0";
            };
            readonly stems: readonly ["drums", "other"];
        }, {
            readonly match: {
                readonly extract_type: "1";
                readonly detailed: "0";
            };
            readonly stems: readonly ["drums", "other", "vocals"];
        }, {
            readonly match: {
                readonly extract_type: "1";
                readonly detailed: "1";
            };
            readonly stems: readonly ["drums", "drums-bsroformer-sw", "drums-melroformer", "drums-scnet", "other", "vocals"];
        }, {
            readonly match: {
                readonly extract_type: "0";
                readonly detailed: "1";
            };
            readonly stems: readonly ["drums", "drums-bsroformer-sw", "drums-melroformer", "drums-scnet", "other"];
        }];
    };
    readonly MVSepBass: {
        readonly id: 41;
        readonly name: "MVSep Bass (bass, other)";
        readonly active: true;
        readonly group: "Drums, Bass and Synth";
        readonly groupId: 20;
        readonly widget: "single_upload";
        readonly stems: readonly ["bass", "other", "vocals", "bass-bsroformer-sw", "bass-scnet-xl"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.6176;
            readonly total: 34;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Bass model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "5";
            readonly choices: {
                readonly "0": "BS Roformer (SDR bass: 12.49)";
                readonly "1": "HTDemucs4 (SDR bass: 12.52)";
                readonly "2": "SCNet XL (SDR bass: 13.81)";
                readonly "3": "BS + HTDemucs + SCNet (SDR bass: 14.07)";
                readonly "4": "BS Roformer SW (SDR bass: 14.62)";
                readonly "5": "BS Roformer SW + SCNet XL (SDR bass: 14.87)";
            };
        }, {
            readonly name: "add_opt2";
            readonly text: "How to extract";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Extract directly from mixture";
                readonly "1": "Extract from instrumental part";
            };
        }, {
            readonly name: "add_opt3";
            readonly text: "Output files";
            readonly serverKey: "detailed";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Standard set";
                readonly "1": "Include results of independent models";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly model_type: "5";
                readonly extract_type: "0";
                readonly detailed: "0";
            };
            readonly stems: readonly ["bass", "other"];
        }, {
            readonly match: {
                readonly model_type: "5";
                readonly extract_type: "1";
                readonly detailed: "0";
            };
            readonly stems: readonly ["bass", "other", "vocals"];
        }, {
            readonly match: {
                readonly model_type: "4";
                readonly extract_type: "0";
                readonly detailed: "0";
            };
            readonly stems: readonly ["bass", "other"];
        }, {
            readonly match: {
                readonly model_type: "5";
                readonly extract_type: "1";
                readonly detailed: "1";
            };
            readonly stems: readonly ["bass", "bass-bsroformer-sw", "bass-scnet-xl", "other", "vocals"];
        }, {
            readonly match: {
                readonly model_type: "5";
                readonly extract_type: "0";
                readonly detailed: "1";
            };
            readonly stems: readonly ["bass", "bass-bsroformer-sw", "bass-scnet-xl", "other"];
        }];
    };
    readonly MVSep_Synth: {
        readonly id: 88;
        readonly name: "MVSep Synth (synth, other)";
        readonly active: true;
        readonly group: "Drums, Bass and Synth";
        readonly groupId: 20;
        readonly widget: "single_upload";
        readonly stems: readonly ["synth", "other", "instrum", "vocals"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.7541;
            readonly total: 61;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "How to extract";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Extract directly from mixture";
                readonly "1": "Extract from instrumental part";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly extract_type: "0";
            };
            readonly stems: readonly ["other", "synth"];
        }, {
            readonly match: {
                readonly extract_type: "1";
            };
            readonly stems: readonly ["instrum", "other", "synth", "vocals"];
        }];
    };
    readonly DrumSep: {
        readonly id: 37;
        readonly name: "DrumSep (4-6 stems: kick, snare, cymbals, toms, ride, hh, crash)";
        readonly active: true;
        readonly group: "Drums, Bass and Synth";
        readonly groupId: 20;
        readonly widget: "single_upload";
        readonly stems: readonly ["drums", "kick", "snare", "toms", "ride", "hh", "crash", "residual", "cymbals", "crash-ride", "hihat", "crash_ride"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.887;
            readonly total: 345;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Model Type";
            readonly serverKey: "model_type";
            readonly defaultKey: "7";
            readonly choices: {
                readonly "0": "HDemucs by inagoy (4 stems)";
                readonly "1": "MDX23C by aufr33 and jarredou (6 stems)";
                readonly "2": "SCNet XL (5 stems)";
                readonly "3": "SCNet XL (6 stems)";
                readonly "4": "SCNet XL (4 stems)";
                readonly "5": "Ensemble of 4 models (MDX23C + 3 * SCNet XL, 8 stems)";
                readonly "6": "MelBand Roformer (4 stems)";
                readonly "7": "MelBand Roformer (6 stems)";
                readonly "8": "BS Roformer by jarredou (5 stems)";
            };
        }, {
            readonly name: "add_opt2";
            readonly text: "Preprocess";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Apply Drums model before";
                readonly "1": "Use as is (audio must contain drums only)";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly model_type: "7";
                readonly extract_type: "0";
            };
            readonly stems: readonly ["crash", "drums", "hh", "kick", "residual", "ride", "snare", "toms"];
        }, {
            readonly match: {
                readonly model_type: "7";
                readonly extract_type: "1";
            };
            readonly stems: readonly ["crash", "hh", "kick", "residual", "ride", "snare", "toms"];
        }, {
            readonly match: {
                readonly model_type: "6";
                readonly extract_type: "0";
            };
            readonly stems: readonly ["cymbals", "drums", "kick", "residual", "snare", "toms"];
        }, {
            readonly match: {
                readonly model_type: "6";
                readonly extract_type: "1";
            };
            readonly stems: readonly ["cymbals", "kick", "residual", "snare", "toms"];
        }, {
            readonly match: {
                readonly model_type: "0";
                readonly extract_type: "0";
            };
            readonly stems: readonly ["cymbals", "drums", "kick", "residual", "snare", "toms"];
        }, {
            readonly match: {
                readonly model_type: "5";
                readonly extract_type: "0";
            };
            readonly stems: readonly ["crash", "crash-ride", "cymbals", "drums", "hh", "kick", "ride", "snare", "toms"];
        }, {
            readonly match: {
                readonly model_type: "5";
                readonly extract_type: "1";
            };
            readonly stems: readonly ["crash", "crash-ride", "cymbals", "hh", "kick", "ride", "snare", "toms"];
        }, {
            readonly match: {
                readonly model_type: "3";
                readonly extract_type: "0";
            };
            readonly stems: readonly ["crash", "drums", "hh", "kick", "residual", "ride", "snare", "toms"];
        }];
    };
    readonly MVSepPiano: {
        readonly id: 29;
        readonly name: "MVSep Piano (piano, other)";
        readonly active: true;
        readonly group: "Keys";
        readonly groupId: 19;
        readonly widget: "single_upload";
        readonly stems: readonly ["piano", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.1923;
            readonly total: 52;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Piano model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "5";
            readonly choices: {
                readonly "0": "mdx23c (2023.08, SDR: 4.79)";
                readonly "1": "mdx23c (2024.09, SDR: 5.59)";
                readonly "2": "MelRoformer (viperx, SDR: 5.71)";
                readonly "3": "SCNet Large (2024.09, SDR: 5.89)";
                readonly "4": "Ensemble (SCNet + Mel, SDR: 6.20)";
                readonly "5": "BS Roformer SW (SDR: 7.83)";
            };
        }];
    };
    readonly MVSepDigitalPiano: {
        readonly id: 79;
        readonly name: "MVSep Digital Piano (digital-piano, other)";
        readonly active: true;
        readonly group: "Keys";
        readonly groupId: 19;
        readonly widget: "single_upload";
        readonly stems: readonly ["digital-piano", "other", "all-piano", "no-piano", "other-piano"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.8519;
            readonly total: 54;
        };
        readonly fields: readonly [{
            readonly name: "add_opt2";
            readonly text: "How to extract";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Extract directly from mixture";
                readonly "1": "Extract from piano part";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly extract_type: "0";
            };
            readonly stems: readonly ["digital-piano", "other"];
        }, {
            readonly match: {
                readonly extract_type: "1";
            };
            readonly stems: readonly ["all-piano", "digital-piano", "no-piano", "other-piano"];
        }];
    };
    readonly MVSepKeys: {
        readonly id: 106;
        readonly name: "MVSep Keys (keys, other)";
        readonly active: true;
        readonly group: "Keys";
        readonly groupId: 19;
        readonly widget: "single_upload";
        readonly stems: readonly ["keys", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.7419;
            readonly total: 31;
        };
    };
    readonly MVSepOrgan: {
        readonly id: 58;
        readonly name: "MVSep Organ (organ, other)";
        readonly active: true;
        readonly group: "Keys";
        readonly groupId: 19;
        readonly widget: "single_upload";
        readonly stems: readonly ["organ", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.7031;
            readonly total: 64;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Organ model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "3";
            readonly choices: {
                readonly "0": "SCNet XL (SDR organ: 2.71)";
                readonly "1": "MelBand Roformer (SDR organ: 2.77)";
                readonly "2": "Mel + SCNet (SDR organ: 3.05)";
                readonly "3": "BS Roformer (SDR organ: 5.08)";
            };
        }];
    };
    readonly MVSepHarpsichord: {
        readonly id: 91;
        readonly name: "MVSep Harpsichord (harpsichord, other)";
        readonly active: true;
        readonly group: "Keys";
        readonly groupId: 19;
        readonly widget: "single_upload";
        readonly stems: readonly ["harpsichord", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.7778;
            readonly total: 9;
        };
    };
    readonly MVSepAccordion: {
        readonly id: 99;
        readonly name: "MVSep Accordion (accordion, other)";
        readonly active: true;
        readonly group: "Keys";
        readonly groupId: 19;
        readonly widget: "single_upload";
        readonly stems: readonly ["accordion", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 5;
            readonly total: 10;
        };
    };
    readonly MVSepVibraphone: {
        readonly id: 129;
        readonly name: "MVSep Vibraphone";
        readonly active: true;
        readonly group: "Keys";
        readonly groupId: 19;
        readonly widget: "single_upload";
        readonly stems: readonly ["vibes", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.8;
            readonly total: 60;
        };
    };
    readonly MVSepMetalBars: {
        readonly id: 130;
        readonly name: "MVSep Metal Bars";
        readonly active: true;
        readonly group: "Keys";
        readonly groupId: 19;
        readonly widget: "single_upload";
        readonly stems: readonly ["metal-bars", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.125;
            readonly total: 8;
        };
    };
    readonly MVSepRhodes: {
        readonly id: 131;
        readonly name: "MVSep Rhodes";
        readonly active: true;
        readonly group: "Keys";
        readonly groupId: 19;
        readonly widget: "single_upload";
        readonly stems: readonly ["rhodes", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.7143;
            readonly total: 56;
        };
    };
    readonly MVSepClavinet: {
        readonly id: 135;
        readonly name: "MVSep Clavinet";
        readonly active: true;
        readonly group: "Keys";
        readonly groupId: 19;
        readonly widget: "single_upload";
        readonly stems: readonly ["clavinet", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.7031;
            readonly total: 64;
        };
    };
    readonly MVSepMellotron: {
        readonly id: 136;
        readonly name: "MVSep Mellotron";
        readonly active: true;
        readonly group: "Keys";
        readonly groupId: 19;
        readonly widget: "single_upload";
        readonly stems: readonly ["mellotron", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.5263;
            readonly total: 76;
        };
    };
    readonly MVSepGuitar: {
        readonly id: 31;
        readonly name: "MVSep Guitar (guitar, other)";
        readonly active: true;
        readonly group: "Guitars";
        readonly groupId: 18;
        readonly widget: "single_upload";
        readonly stems: readonly ["guitar", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.0667;
            readonly total: 15;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Guitar model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "7";
            readonly choices: {
                readonly "0": "mdx23c (2023.08, SDR: 4.78)";
                readonly "2": "mdx23c (2024.06, SDR: 6.34)";
                readonly "3": "MelRoformer (2024.06, SDR: 7.02)";
                readonly "5": "BSRoformer (viperx, SDR: 7.16)";
                readonly "6": "Ensemble (BS + Mel, SDR: 7.51)";
                readonly "7": "BS Roformer SW (SDR: 9.05)";
            };
        }];
    };
    readonly MVSepAcousticGuitar: {
        readonly id: 66;
        readonly name: "MVSep Acoustic Guitar (acoustic-guitar, other)";
        readonly active: true;
        readonly group: "Guitars";
        readonly groupId: 18;
        readonly widget: "single_upload";
        readonly stems: readonly ["acoustic-guitar", "other", "all-guitar", "no-guitar", "other-guitar"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.8804;
            readonly total: 92;
        };
        readonly fields: readonly [{
            readonly name: "add_opt2";
            readonly text: "How to extract";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Extract directly from mixture";
                readonly "1": "Extract from guitar part";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly extract_type: "0";
            };
            readonly stems: readonly ["acoustic-guitar", "other"];
        }, {
            readonly match: {
                readonly extract_type: "1";
            };
            readonly stems: readonly ["acoustic-guitar", "all-guitar", "no-guitar", "other-guitar"];
        }];
    };
    readonly MVSepElectricGuitar: {
        readonly id: 81;
        readonly name: "MVSep Electric Guitar (electric-guitar, other)";
        readonly active: true;
        readonly group: "Guitars";
        readonly groupId: 18;
        readonly widget: "single_upload";
        readonly stems: readonly ["electric-guitar", "other", "all-guitar", "no-guitar", "other-guitar"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.8611;
            readonly total: 36;
        };
        readonly fields: readonly [{
            readonly name: "add_opt2";
            readonly text: "How to extract";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Extract directly from mixture";
                readonly "1": "Extract from guitar part";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly extract_type: "0";
            };
            readonly stems: readonly ["electric-guitar", "other"];
        }, {
            readonly match: {
                readonly extract_type: "1";
            };
            readonly stems: readonly ["all-guitar", "electric-guitar", "no-guitar", "other-guitar"];
        }];
    };
    readonly MVSepLeadRhythmGuitar: {
        readonly id: 101;
        readonly name: "MVSep Lead/Rhythm Guitar (lead-guitar, rhythm-guitar)";
        readonly active: true;
        readonly group: "Guitars";
        readonly groupId: 18;
        readonly widget: "single_upload";
        readonly stems: readonly ["lead-guitar", "rhythm-guitar", "all-guitar", "no-guitar"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.5856;
            readonly total: 111;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Two-stage model (SDR: 9.21)";
                readonly "1": "One-stage model (SDR: 9.02)";
            };
        }];
    };
    readonly MVSepPedalSteelGuitar: {
        readonly id: 124;
        readonly name: "MVSep Pedal Steel Guitar";
        readonly active: true;
        readonly group: "Guitars";
        readonly groupId: 18;
        readonly widget: "single_upload";
        readonly stems: readonly ["pedal-steel-guitar", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 5;
            readonly total: 12;
        };
    };
    readonly MVSepPluckedStrings: {
        readonly id: 102;
        readonly name: "MVSep Plucked Strings (plucked-strings, other)";
        readonly active: true;
        readonly group: "Plucked Strings";
        readonly groupId: 17;
        readonly widget: "single_upload";
        readonly stems: readonly ["plucked-strings", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.75;
            readonly total: 4;
        };
    };
    readonly MVSepHarp: {
        readonly id: 72;
        readonly name: "MVSep Harp (harp, other)";
        readonly active: true;
        readonly group: "Plucked Strings";
        readonly groupId: 17;
        readonly widget: "single_upload";
        readonly stems: readonly ["harp", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 5;
            readonly total: 6;
        };
    };
    readonly MVSepMandolin: {
        readonly id: 74;
        readonly name: "MVSep Mandolin (mandolin, other)";
        readonly active: true;
        readonly group: "Plucked Strings";
        readonly groupId: 17;
        readonly widget: "single_upload";
        readonly stems: readonly ["mandolin", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 5;
            readonly total: 1;
        };
    };
    readonly MVSepBanjo: {
        readonly id: 83;
        readonly name: "MVSep Banjo (banjo, other)";
        readonly active: true;
        readonly group: "Plucked Strings";
        readonly groupId: 17;
        readonly widget: "single_upload";
        readonly stems: readonly ["banjo", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.8;
            readonly total: 5;
        };
    };
    readonly MVSepSitar: {
        readonly id: 90;
        readonly name: "MVSep Sitar (sitar, other)";
        readonly active: true;
        readonly group: "Plucked Strings";
        readonly groupId: 17;
        readonly widget: "single_upload";
        readonly stems: readonly ["sitar", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 5;
            readonly total: 2;
        };
    };
    readonly MVSepUkulele: {
        readonly id: 96;
        readonly name: "MVSep Ukulele (ukulele, other)";
        readonly active: true;
        readonly group: "Plucked Strings";
        readonly groupId: 17;
        readonly widget: "single_upload";
        readonly stems: readonly ["ukulele", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4;
            readonly total: 1;
        };
    };
    readonly MVSepDobro: {
        readonly id: 97;
        readonly name: "MVSep Dobro (dobro, other)";
        readonly active: true;
        readonly group: "Plucked Strings";
        readonly groupId: 17;
        readonly widget: "single_upload";
        readonly stems: readonly ["dobro", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.75;
            readonly total: 8;
        };
    };
    readonly MVSepBowedStrings: {
        readonly id: 52;
        readonly name: "MVSep Bowed Strings (strings, other)";
        readonly active: true;
        readonly group: "Bowed Strings";
        readonly groupId: 16;
        readonly widget: "single_upload";
        readonly stems: readonly ["strings", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.8712;
            readonly total: 132;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "String model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "1";
            readonly choices: {
                readonly "0": "MDX23C (SDR strings: 3.84)";
                readonly "1": "BS Roformer (SDR strings: 5.41)";
                readonly "2": "BS Roformer by gilliaan (SDR strings: 4.69)";
            };
        }, {
            readonly name: "add_opt2";
            readonly text: "How to extract";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Extract directly from mixture";
                readonly "1": "Extract from instrumental part";
            };
        }];
    };
    readonly MVSepViolin: {
        readonly id: 65;
        readonly name: "MVSep Violin (violin, other)";
        readonly active: true;
        readonly group: "Bowed Strings";
        readonly groupId: 16;
        readonly widget: "single_upload";
        readonly stems: readonly ["violin", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.8387;
            readonly total: 31;
        };
    };
    readonly MVSepViola: {
        readonly id: 69;
        readonly name: "MVSep Viola (viola, other)";
        readonly active: true;
        readonly group: "Bowed Strings";
        readonly groupId: 16;
        readonly widget: "single_upload";
        readonly stems: readonly ["viola", "other", "all-strings", "no-strings", "other-strings"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.8571;
            readonly total: 7;
        };
        readonly fields: readonly [{
            readonly name: "add_opt2";
            readonly text: "How to extract";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Extract directly from mixture";
                readonly "1": "Extract from strings part";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly extract_type: "0";
            };
            readonly stems: readonly ["other", "viola"];
        }, {
            readonly match: {
                readonly extract_type: "1";
            };
            readonly stems: readonly ["all-strings", "no-strings", "other-strings", "viola"];
        }];
    };
    readonly MVSepCello: {
        readonly id: 70;
        readonly name: "MVSep Cello (cello, other)";
        readonly active: true;
        readonly group: "Bowed Strings";
        readonly groupId: 16;
        readonly widget: "single_upload";
        readonly stems: readonly ["cello", "other", "all-strings", "no-strings", "other-strings"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 5;
            readonly total: 13;
        };
        readonly fields: readonly [{
            readonly name: "add_opt2";
            readonly text: "How to extract";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Extract directly from mixture";
                readonly "1": "Extract from strings part";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly extract_type: "0";
            };
            readonly stems: readonly ["cello", "other"];
        }, {
            readonly match: {
                readonly extract_type: "1";
            };
            readonly stems: readonly ["all-strings", "cello", "no-strings", "other-strings"];
        }];
    };
    readonly MVSepDoubleBass: {
        readonly id: 73;
        readonly name: "MVSep Double Bass (double-bass, other)";
        readonly active: true;
        readonly group: "Bowed Strings";
        readonly groupId: 16;
        readonly widget: "single_upload";
        readonly stems: readonly ["double-bass", "other", "all-strings", "no-strings", "other-strings"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.3333;
            readonly total: 3;
        };
        readonly fields: readonly [{
            readonly name: "add_opt2";
            readonly text: "How to extract";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Extract directly from mixture";
                readonly "1": "Extract from strings part";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly extract_type: "0";
            };
            readonly stems: readonly ["double-bass", "other"];
        }, {
            readonly match: {
                readonly extract_type: "1";
            };
            readonly stems: readonly ["all-strings", "double-bass", "no-strings", "other-strings"];
        }];
    };
    readonly MVSepWind: {
        readonly id: 54;
        readonly name: "MVSep Wind (wind, other)";
        readonly active: true;
        readonly group: "Wind";
        readonly groupId: 15;
        readonly widget: "single_upload";
        readonly stems: readonly ["wind", "other", "vocals"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.4286;
            readonly total: 21;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Wind model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "3";
            readonly choices: {
                readonly "0": "MelBand Roformer (SDR wind: 6.73)";
                readonly "1": "SCNet Large (SDR wind: 6.76)";
                readonly "2": "Mel + SCNet (SDR wind: 7.22)";
                readonly "3": "BS Roformer (SDR wind: 9.82)";
            };
        }, {
            readonly name: "add_opt2";
            readonly text: "How to extract";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Extract directly from mixture";
                readonly "1": "Extract from instrumental part";
            };
        }, {
            readonly name: "add_opt3";
            readonly text: "Output files";
            readonly serverKey: "detailed";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Standard set";
                readonly "1": "Include results of independent models";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly extract_type: "0";
            };
            readonly stems: readonly ["other", "wind"];
        }, {
            readonly match: {
                readonly extract_type: "1";
            };
            readonly stems: readonly ["other", "vocals", "wind"];
        }];
    };
    readonly MVSepBrass: {
        readonly id: 107;
        readonly name: "MVSep Brass (brass, other)";
        readonly active: true;
        readonly group: "Wind";
        readonly groupId: 15;
        readonly widget: "single_upload";
        readonly stems: readonly ["brass", "other", "all-wind", "no-wind", "other-wind"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.5273;
            readonly total: 55;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "How to extract";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Extract directly from mixture";
                readonly "1": "Extract from wind part";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly extract_type: "0";
            };
            readonly stems: readonly ["brass", "other"];
        }, {
            readonly match: {
                readonly extract_type: "1";
            };
            readonly stems: readonly ["all-wind", "brass", "no-wind", "other-wind"];
        }];
    };
    readonly MVSepWoodwind: {
        readonly id: 108;
        readonly name: "MVSep Woodwind (woodwind, other)";
        readonly active: true;
        readonly group: "Wind";
        readonly groupId: 15;
        readonly widget: "single_upload";
        readonly stems: readonly ["woodwind", "other", "all-wind", "no-wind", "other-wind"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.7;
            readonly total: 10;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "How to extract";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Extract directly from mixture";
                readonly "1": "Extract from wind part";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly extract_type: "0";
            };
            readonly stems: readonly ["other", "woodwind"];
        }, {
            readonly match: {
                readonly extract_type: "1";
            };
            readonly stems: readonly ["all-wind", "no-wind", "other-wind", "woodwind"];
        }];
    };
    readonly MVSepSaxophone: {
        readonly id: 61;
        readonly name: "MVSep Saxophone (saxophone, other)";
        readonly active: true;
        readonly group: "Wind";
        readonly groupId: 15;
        readonly widget: "single_upload";
        readonly stems: readonly ["saxophone", "other", "saxophone-melroformer", "saxophone-scnet"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.66;
            readonly total: 50;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "3";
            readonly choices: {
                readonly "0": "SCNet XL (SDR saxophone: 6.15)";
                readonly "1": "MelBand Roformer (SDR saxophone: 6.97)";
                readonly "2": "Mel + SCNet (SDR saxophone: 7.13)";
                readonly "3": "BS Roformer (SDR saxophone: 9.77)";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly model_type: "3";
            };
            readonly stems: readonly ["other", "saxophone"];
        }, {
            readonly match: {
                readonly model_type: "0";
            };
            readonly stems: readonly ["other", "saxophone"];
        }, {
            readonly match: {
                readonly model_type: "2";
            };
            readonly stems: readonly ["other", "saxophone", "saxophone-melroformer", "saxophone-scnet"];
        }, {
            readonly match: {
                readonly model_type: "1";
            };
            readonly stems: readonly ["other", "saxophone"];
        }];
    };
    readonly MVSepFlute: {
        readonly id: 67;
        readonly name: "MVSep Flute (flute, other)";
        readonly active: true;
        readonly group: "Wind";
        readonly groupId: 15;
        readonly widget: "single_upload";
        readonly stems: readonly ["flute", "other", "all-wind", "no-wind", "other-wind"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.7;
            readonly total: 20;
        };
        readonly fields: readonly [{
            readonly name: "add_opt2";
            readonly text: "How to extract";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Extract directly from mixture";
                readonly "1": "Extract from wind part";
            };
        }, {
            readonly name: "add_opt1";
            readonly text: "Flute model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "1";
            readonly choices: {
                readonly "0": "SCNet XL (SDR flute: 6.27)";
                readonly "1": "BS Roformer (SDR flute: 9.46)";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly extract_type: "0";
            };
            readonly stems: readonly ["flute", "other"];
        }, {
            readonly match: {
                readonly extract_type: "1";
            };
            readonly stems: readonly ["all-wind", "flute", "no-wind", "other-wind"];
        }];
    };
    readonly MVSepTrumpet: {
        readonly id: 71;
        readonly name: "MVSep Trumpet (trumpet, other)";
        readonly active: true;
        readonly group: "Wind";
        readonly groupId: 15;
        readonly widget: "single_upload";
        readonly stems: readonly ["trumpet", "other", "all-wind", "no-wind", "other-wind"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.8519;
            readonly total: 27;
        };
        readonly fields: readonly [{
            readonly name: "add_opt2";
            readonly text: "How to extract";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Extract directly from mixture";
                readonly "1": "Extract from wind part";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly extract_type: "0";
            };
            readonly stems: readonly ["other", "trumpet"];
        }, {
            readonly match: {
                readonly extract_type: "1";
            };
            readonly stems: readonly ["all-wind", "no-wind", "other-wind", "trumpet"];
        }];
    };
    readonly MVSepTrombone: {
        readonly id: 75;
        readonly name: "MVSep Trombone (trombone, other)";
        readonly active: true;
        readonly group: "Wind";
        readonly groupId: 15;
        readonly widget: "single_upload";
        readonly stems: readonly ["trombone", "other", "all-wind", "no-wind", "other-wind"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 5;
            readonly total: 15;
        };
        readonly fields: readonly [{
            readonly name: "add_opt2";
            readonly text: "How to extract";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Extract directly from mixture";
                readonly "1": "Extract from wind part";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly extract_type: "0";
            };
            readonly stems: readonly ["other", "trombone"];
        }, {
            readonly match: {
                readonly extract_type: "1";
            };
            readonly stems: readonly ["all-wind", "no-wind", "other-wind", "trombone"];
        }];
    };
    readonly MVSepOboe: {
        readonly id: 77;
        readonly name: "MVSep Oboe (oboe, other)";
        readonly active: true;
        readonly group: "Wind";
        readonly groupId: 15;
        readonly widget: "single_upload";
        readonly stems: readonly ["oboe", "other", "all-wind", "no-wind", "other-wind"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 5;
            readonly total: 2;
        };
        readonly fields: readonly [{
            readonly name: "add_opt2";
            readonly text: "How to extract";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Extract directly from mixture";
                readonly "1": "Extract from wind part";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly extract_type: "0";
            };
            readonly stems: readonly ["oboe", "other"];
        }, {
            readonly match: {
                readonly extract_type: "1";
            };
            readonly stems: readonly ["all-wind", "no-wind", "oboe", "other-wind"];
        }];
    };
    readonly MVSepClarinet: {
        readonly id: 78;
        readonly name: "MVSep Clarinet (clarinet, other)";
        readonly active: true;
        readonly group: "Wind";
        readonly groupId: 15;
        readonly widget: "single_upload";
        readonly stems: readonly ["clarinet", "other", "all-wind", "no-wind", "other-wind"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 5;
            readonly total: 3;
        };
        readonly fields: readonly [{
            readonly name: "add_opt2";
            readonly text: "How to extract";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Extract directly from mixture";
                readonly "1": "Extract from wind part";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly extract_type: "0";
            };
            readonly stems: readonly ["clarinet", "other"];
        }, {
            readonly match: {
                readonly extract_type: "1";
            };
            readonly stems: readonly ["all-wind", "clarinet", "no-wind", "other-wind"];
        }];
    };
    readonly MVSepFrenchHorn: {
        readonly id: 82;
        readonly name: "MVSep French Horn (french-horn, other)";
        readonly active: true;
        readonly group: "Wind";
        readonly groupId: 15;
        readonly widget: "single_upload";
        readonly stems: readonly ["french-horn", "other", "all-wind", "no-wind", "other-wind"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.9286;
            readonly total: 42;
        };
        readonly fields: readonly [{
            readonly name: "add_opt2";
            readonly text: "How to extract";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Extract directly from mixture";
                readonly "1": "Extract from wind part";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly extract_type: "0";
            };
            readonly stems: readonly ["french-horn", "other"];
        }, {
            readonly match: {
                readonly extract_type: "1";
            };
            readonly stems: readonly ["all-wind", "french-horn", "no-wind", "other-wind"];
        }];
    };
    readonly MVSepHarmonica: {
        readonly id: 87;
        readonly name: "MVSep Harmonica (harmonica, other)";
        readonly active: true;
        readonly group: "Wind";
        readonly groupId: 15;
        readonly widget: "single_upload";
        readonly stems: readonly ["harmonica", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 5;
            readonly total: 19;
        };
        readonly fields: readonly [{
            readonly name: "add_opt2";
            readonly text: "How to extract";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Extract directly from mixture";
                readonly "1": "Extract from wind part";
            };
        }];
    };
    readonly MVSepTuba: {
        readonly id: 92;
        readonly name: "MVSep Tuba (tuba, other)";
        readonly active: true;
        readonly group: "Wind";
        readonly groupId: 15;
        readonly widget: "single_upload";
        readonly stems: readonly ["tuba", "other"];
        readonly priceCoefficient: 1;
    };
    readonly MVSepBassoon: {
        readonly id: 93;
        readonly name: "MVSep Bassoon (bassoon, other)";
        readonly active: true;
        readonly group: "Wind";
        readonly groupId: 15;
        readonly widget: "single_upload";
        readonly stems: readonly ["bassoon", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.8966;
            readonly total: 29;
        };
    };
    readonly MVSepBagpipes: {
        readonly id: 116;
        readonly name: "MVSep Bagpipes (bagpipes , other)";
        readonly active: true;
        readonly group: "Wind";
        readonly groupId: 15;
        readonly widget: "single_upload";
        readonly stems: readonly ["bagpipes", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.3667;
            readonly total: 30;
        };
        readonly fields: readonly [{
            readonly name: "add_opt2";
            readonly text: "How to extract";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Extract directly from mixture";
                readonly "1": "Extract from wind part";
            };
        }];
    };
    readonly MVSepWhistle: {
        readonly id: 132;
        readonly name: "MVSep Whistle";
        readonly active: true;
        readonly group: "Wind";
        readonly groupId: 15;
        readonly widget: "single_upload";
        readonly stems: readonly ["whistle", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.2778;
            readonly total: 18;
        };
    };
    readonly MVSepPercussion: {
        readonly id: 105;
        readonly name: "MVSep Percussion (percussion, other)";
        readonly active: true;
        readonly group: "Percussion";
        readonly groupId: 14;
        readonly widget: "single_upload";
        readonly stems: readonly ["percussion", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.3273;
            readonly total: 55;
        };
    };
    readonly MVSepTambourine: {
        readonly id: 76;
        readonly name: "MVSep Tambourine (tambourine, other)";
        readonly active: true;
        readonly group: "Percussion";
        readonly groupId: 14;
        readonly widget: "single_upload";
        readonly stems: readonly ["tambourine", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.8333;
            readonly total: 18;
        };
    };
    readonly MVSepMarimba: {
        readonly id: 84;
        readonly name: "MVSep Marimba (marimba, other)";
        readonly active: true;
        readonly group: "Percussion";
        readonly groupId: 14;
        readonly widget: "single_upload";
        readonly stems: readonly ["marimba", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 5;
            readonly total: 1;
        };
    };
    readonly MVSepGlockenspiel: {
        readonly id: 85;
        readonly name: "MVSep Glockenspiel (glockenspiel, other)";
        readonly active: true;
        readonly group: "Percussion";
        readonly groupId: 14;
        readonly widget: "single_upload";
        readonly stems: readonly ["glockenspiel", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.5;
            readonly total: 4;
        };
    };
    readonly MVSepTimpani: {
        readonly id: 86;
        readonly name: "MVSep Timpani (timpani, other)";
        readonly active: true;
        readonly group: "Percussion";
        readonly groupId: 14;
        readonly widget: "single_upload";
        readonly stems: readonly ["timpani", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 5;
            readonly total: 2;
        };
    };
    readonly MVSepTriangle: {
        readonly id: 89;
        readonly name: "MVSep Triangle (triangle, other)";
        readonly active: true;
        readonly group: "Percussion";
        readonly groupId: 14;
        readonly widget: "single_upload";
        readonly stems: readonly ["triangle", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.6;
            readonly total: 5;
        };
    };
    readonly MVSepCongas: {
        readonly id: 94;
        readonly name: "MVSep Congas (congas , other)";
        readonly active: true;
        readonly group: "Percussion";
        readonly groupId: 14;
        readonly widget: "single_upload";
        readonly stems: readonly ["congas", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 5;
            readonly total: 20;
        };
    };
    readonly MVSepBells: {
        readonly id: 95;
        readonly name: "MVSep Bells (bells, other)";
        readonly active: true;
        readonly group: "Percussion";
        readonly groupId: 14;
        readonly widget: "single_upload";
        readonly stems: readonly ["bells", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.8421;
            readonly total: 38;
        };
    };
    readonly MVSepWindChimes: {
        readonly id: 98;
        readonly name: "MVSep Wind Chimes (wind-chimes, other)";
        readonly active: true;
        readonly group: "Percussion";
        readonly groupId: 14;
        readonly widget: "single_upload";
        readonly stems: readonly ["wind-chimes", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 5;
            readonly total: 1;
        };
    };
    readonly MVSepXylophone: {
        readonly id: 109;
        readonly name: "MVSep Xylophone (xylophone, other)";
        readonly active: true;
        readonly group: "Percussion";
        readonly groupId: 14;
        readonly widget: "single_upload";
        readonly stems: readonly ["xylophone", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 5;
            readonly total: 4;
        };
        readonly fields: readonly [{
            readonly name: "add_opt2";
            readonly text: "How to extract";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Extract directly from mixture";
                readonly "1": "Extract from percussion part";
            };
        }];
    };
    readonly MVSepCelesta: {
        readonly id: 110;
        readonly name: "MVSep Celesta (celesta, other)";
        readonly active: true;
        readonly group: "Percussion";
        readonly groupId: 14;
        readonly widget: "single_upload";
        readonly stems: readonly ["celesta", "other"];
        readonly priceCoefficient: 1;
        readonly fields: readonly [{
            readonly name: "add_opt2";
            readonly text: "How to extract";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Extract directly from mixture";
                readonly "1": "Extract from percussion part";
            };
        }];
    };
    readonly MVSepClap: {
        readonly id: 133;
        readonly name: "MVSep Clap";
        readonly active: true;
        readonly group: "Percussion";
        readonly groupId: 14;
        readonly widget: "single_upload";
        readonly stems: readonly ["clap", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.9231;
            readonly total: 13;
        };
    };
    readonly MVSepCowbell: {
        readonly id: 128;
        readonly name: "MVSep Cowbell";
        readonly active: true;
        readonly group: "Percussion";
        readonly groupId: 14;
        readonly widget: "single_upload";
        readonly stems: readonly ["cowbell", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.8182;
            readonly total: 11;
        };
    };
    readonly MVSepDemucs4HTDNR: {
        readonly id: 24;
        readonly name: "MVSep Demucs4HT DNR (speech, music, effects)";
        readonly active: true;
        readonly group: "Effects";
        readonly groupId: 13;
        readonly widget: "single_upload";
        readonly stems: readonly ["dialog", "music", "effect", "instrumental"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4;
            readonly total: 11;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Single (SDR: 9.62)";
                readonly "1": "Ensemble (SDR: 10.16)";
            };
        }];
    };
    readonly BandItPlus: {
        readonly id: 36;
        readonly name: "BandIt Plus (speech, music, effects)";
        readonly active: true;
        readonly group: "Effects";
        readonly groupId: 13;
        readonly widget: "single_upload";
        readonly stems: readonly ["speech", "music", "effects"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 3;
            readonly total: 3;
        };
    };
    readonly BandItV2: {
        readonly id: 45;
        readonly name: "BandIt v2 (speech, music, effects)";
        readonly active: true;
        readonly group: "Effects";
        readonly groupId: 13;
        readonly widget: "single_upload";
        readonly stems: readonly ["speech", "music", "sfx"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 3;
            readonly total: 9;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Model Type";
            readonly serverKey: "model_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Multi language model";
                readonly "1": "English model";
                readonly "2": "German model";
                readonly "3": "French model";
                readonly "4": "Spanish model";
                readonly "5": "Chinese model";
                readonly "6": "Faroese model";
            };
        }];
    };
    readonly MVSepDnRV3: {
        readonly id: 56;
        readonly name: "MVSep DnR v3 (speech, music, effects)";
        readonly active: true;
        readonly group: "Effects";
        readonly groupId: 13;
        readonly widget: "single_upload";
        readonly stems: readonly ["speech", "music", "sfx"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 3.1875;
            readonly total: 16;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "2";
            readonly choices: {
                readonly "0": "SCNet Large (SDR avg: 11.22)";
                readonly "1": "MelBand Roformer (SDR avg: 10.99)";
                readonly "2": "Mel + SCNet (SDR avg: 11.54)";
            };
        }, {
            readonly name: "add_opt2";
            readonly text: "How to extract";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Extract directly from mixture";
                readonly "1": "Use vocals model to help";
            };
        }, {
            readonly name: "add_opt3";
            readonly text: "Output files";
            readonly serverKey: "detailed";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Standard set";
                readonly "1": "Include results of independent models";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly model_type: "2";
            };
            readonly stems: readonly ["music", "sfx", "speech"];
        }, {
            readonly match: {
                readonly model_type: "1";
            };
            readonly stems: readonly ["music", "sfx", "speech"];
        }, {
            readonly match: {
                readonly model_type: "0";
            };
            readonly stems: readonly ["music", "sfx", "speech"];
        }];
    };
    readonly MVSepBraam: {
        readonly id: 117;
        readonly name: "MVSep Braam";
        readonly active: true;
        readonly group: "Effects";
        readonly groupId: 13;
        readonly widget: "single_upload";
        readonly stems: readonly ["braam", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.75;
            readonly total: 4;
        };
    };
    readonly MVSepRisers: {
        readonly id: 125;
        readonly name: "MVSep Risers";
        readonly active: true;
        readonly group: "Effects";
        readonly groupId: 13;
        readonly widget: "single_upload";
        readonly stems: readonly ["risers", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.4;
            readonly total: 10;
        };
    };
    readonly MVSepFX: {
        readonly id: 122;
        readonly name: "MVSep FX";
        readonly active: true;
        readonly group: "Effects";
        readonly groupId: 13;
        readonly widget: "single_upload";
        readonly stems: readonly ["fx", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.625;
            readonly total: 56;
        };
    };
    readonly ApolloEnhancers: {
        readonly id: 51;
        readonly name: "Apollo Enhancers (by JusperLee, Lew, baicai1145)";
        readonly active: true;
        readonly group: "Upscale and Restoration";
        readonly groupId: 12;
        readonly widget: "single_upload";
        readonly stems: readonly ["restored"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 3;
            readonly total: 18;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "3";
            readonly choices: {
                readonly "0": "MP3 Enhancer (by JusperLee)";
                readonly "1": "Universal Super Resolution (by Lew)";
                readonly "2": "Vocals Super Resolution (by Lew)";
                readonly "3": "Universal Super Resolution (by MVSep Team)";
                readonly "4": "Universal Super Resolution (by baicai1145)";
            };
        }, {
            readonly name: "add_opt2";
            readonly text: "Cutoff (Hz)";
            readonly serverKey: "input_cutoff";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "No cutoff";
                readonly "2000": "2000";
                readonly "3000": "3000";
                readonly "4000": "4000";
                readonly "5000": "5000";
                readonly "6000": "6000";
                readonly "7000": "7000";
                readonly "8000": "8000";
                readonly "9000": "9000";
                readonly "10000": "10000";
                readonly "11000": "11000";
                readonly "12000": "12000";
                readonly "13000": "13000";
                readonly "14000": "14000";
                readonly "15000": "15000";
                readonly "16000": "16000";
                readonly "17000": "17000";
                readonly "18000": "18000";
                readonly "19000": "19000";
                readonly "20000": "20000";
                readonly "21000": "21000";
                readonly "22000": "22000";
            };
        }];
    };
    readonly ReverbRemoval: {
        readonly id: 22;
        readonly name: "Reverb Removal (noreverb)";
        readonly active: true;
        readonly group: "Upscale and Restoration";
        readonly groupId: 12;
        readonly widget: "single_upload";
        readonly stems: readonly ["noreverb", "reverb", "dry", "other", "instrum", "restored", "vocals"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 3.5952;
            readonly total: 42;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Model Type";
            readonly serverKey: "model_type";
            readonly defaultKey: "7";
            readonly choices: {
                readonly "0": "Reverb removal by FoxJoy (MDX-B)";
                readonly "1": "Reverb removal by anvuew (MelRoformer)";
                readonly "2": "Reverb removal by anvuew (BSRoformer)";
                readonly "3": "Reverb removal by anvuew v2 (MelRoformer)";
                readonly "4": "Reverb removal by Sucial (MelRoformer)";
                readonly "5": "Reverb removal by Sucial v2 (MelRoformer)";
                readonly "6": "DeReverb room by anvuew (BSRoformer)";
                readonly "7": "DeReverb stereo by anvuew (BSRoformer)";
                readonly "8": "Reverb removal by aufr33 and jarredou (MDX23C)";
                readonly "9": "MVSep Team (2026.07, BSRoformer)";
            };
        }, {
            readonly name: "add_opt2";
            readonly text: "Preprocess";
            readonly serverKey: "extract_type";
            readonly defaultKey: "1";
            readonly choices: {
                readonly "0": "Extract vocals (needed for Mel/BS Roformer)";
                readonly "1": "Use as is";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly model_type: "7";
                readonly extract_type: "1";
            };
            readonly stems: readonly ["noreverb", "reverb"];
        }, {
            readonly match: {
                readonly model_type: "6";
                readonly extract_type: "1";
            };
            readonly stems: readonly ["noreverb", "reverb"];
        }, {
            readonly match: {
                readonly model_type: "9";
                readonly extract_type: "1";
            };
            readonly stems: readonly ["dry", "other"];
        }, {
            readonly match: {
                readonly model_type: "5";
                readonly extract_type: "0";
            };
            readonly stems: readonly ["instrum", "noreverb", "restored", "reverb", "vocals"];
        }, {
            readonly match: {
                readonly model_type: "0";
                readonly extract_type: "1";
            };
            readonly stems: readonly ["noreverb", "reverb"];
        }, {
            readonly match: {
                readonly model_type: "3";
                readonly extract_type: "1";
            };
            readonly stems: readonly ["noreverb", "reverb"];
        }, {
            readonly match: {
                readonly model_type: "6";
                readonly extract_type: "0";
            };
            readonly stems: readonly ["instrum", "noreverb", "restored", "reverb", "vocals"];
        }, {
            readonly match: {
                readonly model_type: "7";
                readonly extract_type: "0";
            };
            readonly stems: readonly ["instrum", "noreverb", "restored", "reverb", "vocals"];
        }, {
            readonly match: {
                readonly model_type: "5";
                readonly extract_type: "1";
            };
            readonly stems: readonly ["noreverb", "reverb"];
        }, {
            readonly match: {
                readonly model_type: "2";
                readonly extract_type: "1";
            };
            readonly stems: readonly ["noreverb", "reverb"];
        }, {
            readonly match: {
                readonly model_type: "9";
                readonly extract_type: "0";
            };
            readonly stems: readonly ["dry", "instrum", "other", "restored", "vocals"];
        }, {
            readonly match: {
                readonly model_type: "8";
                readonly extract_type: "1";
            };
            readonly stems: readonly ["noreverb", "other"];
        }];
    };
    readonly DeNoiseByAufr33AndGabox: {
        readonly id: 47;
        readonly name: "DeNoise by aufr33 and gabox";
        readonly active: true;
        readonly group: "Upscale and Restoration";
        readonly groupId: 12;
        readonly widget: "single_upload";
        readonly stems: readonly ["dry", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.5644;
            readonly total: 101;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "aufr33 (Standard)";
                readonly "1": "aufr33 (Aggressive)";
                readonly "2": "gabox";
            };
        }];
    };
    readonly AudioSR: {
        readonly id: 59;
        readonly name: "AudioSR (Super Resolution)";
        readonly active: true;
        readonly group: "Upscale and Restoration";
        readonly groupId: 12;
        readonly widget: "single_upload";
        readonly stems: readonly ["restored"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 3.9048;
            readonly total: 42;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Cutoff (Hz)";
            readonly serverKey: "input_cutoff";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Automatic";
                readonly "2000": "2000";
                readonly "3000": "3000";
                readonly "4000": "4000";
                readonly "5000": "5000";
                readonly "6000": "6000";
                readonly "7000": "7000";
                readonly "8000": "8000";
                readonly "9000": "9000";
                readonly "10000": "10000";
                readonly "11000": "11000";
                readonly "12000": "12000";
                readonly "13000": "13000";
                readonly "14000": "14000";
                readonly "15000": "15000";
                readonly "16000": "16000";
                readonly "17000": "17000";
                readonly "18000": "18000";
                readonly "19000": "19000";
                readonly "20000": "20000";
                readonly "21000": "21000";
                readonly "22000": "22000";
            };
        }];
    };
    readonly FlashSR: {
        readonly id: 60;
        readonly name: "FlashSR (Super Resolution)";
        readonly active: true;
        readonly group: "Upscale and Restoration";
        readonly groupId: 12;
        readonly widget: "single_upload";
        readonly stems: readonly ["restored"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 3.3333;
            readonly total: 12;
        };
    };
    readonly Whisper: {
        readonly id: 39;
        readonly name: "Whisper (extract text from audio)";
        readonly active: true;
        readonly group: "ASR and TTS";
        readonly groupId: 11;
        readonly widget: "single_upload";
        readonly stems: readonly [];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 3.4545;
            readonly total: 11;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "1";
            readonly choices: {
                readonly "0": "Apply to original file";
                readonly "1": "Extract vocals first";
            };
        }, {
            readonly name: "add_opt2";
            readonly text: "Transcription type";
            readonly serverKey: "transcription_type";
            readonly defaultKey: "1";
            readonly choices: {
                readonly "0": "New timestamps by linto-ai";
                readonly "1": "Old version of timestamps by whisper";
            };
        }];
    };
    readonly Parakeet: {
        readonly id: 64;
        readonly name: "Parakeet (extract text from audio)";
        readonly active: true;
        readonly group: "ASR and TTS";
        readonly groupId: 11;
        readonly widget: "single_upload";
        readonly stems: readonly [];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 2;
            readonly total: 2;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "1";
            readonly choices: {
                readonly "0": "Apply to original file";
                readonly "1": "Extract vocals first";
            };
        }, {
            readonly name: "add_opt2";
            readonly text: "Version";
            readonly serverKey: "version";
            readonly defaultKey: "1";
            readonly choices: {
                readonly "0": "Parakeet v2";
                readonly "1": "Parakeet v3";
            };
        }];
    };
    readonly VibeVoice: {
        readonly id: 103;
        readonly name: "VibeVoice (Voice Cloning)";
        readonly active: true;
        readonly group: "ASR and TTS";
        readonly groupId: 11;
        readonly widget: "single_upload";
        readonly stems: readonly ["generated", "speech-sample"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 3.75;
            readonly total: 8;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "1";
            readonly choices: {
                readonly "0": "VibeVoce 1.5B (Small)";
                readonly "1": "VibeVoce 7B (Large)";
            };
        }, {
            readonly name: "add_opt2";
            readonly text: "Text prompt";
            readonly serverKey: "prompt";
            readonly choices: {};
        }, {
            readonly name: "add_opt3";
            readonly text: "Extract vocals first";
            readonly serverKey: "extract_type";
            readonly defaultKey: "1";
            readonly choices: {
                readonly "0": "Use original reference file";
                readonly "1": "Extract vocals first";
            };
        }];
    };
    readonly Qwen3TTS: {
        readonly id: 120;
        readonly name: "Qwen3-TTS (Voice Cloning)";
        readonly active: true;
        readonly group: "ASR and TTS";
        readonly groupId: 11;
        readonly widget: "single_upload";
        readonly stems: readonly ["generated", "reference"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 3;
            readonly total: 2;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Text prompt";
            readonly serverKey: "text";
            readonly choices: {};
        }, {
            readonly name: "add_opt2";
            readonly text: "Reference text in audio (optional)";
            readonly serverKey: "ref_text";
            readonly choices: {};
        }, {
            readonly name: "add_opt3";
            readonly text: "Language";
            readonly serverKey: "language";
            readonly defaultKey: "auto";
            readonly choices: {
                readonly auto: "Auto";
                readonly english: "English";
                readonly russian: "Russian";
                readonly chinese: "Chinese";
                readonly french: "French";
                readonly german: "German";
                readonly italian: "Italian";
                readonly japanese: "Japanese";
                readonly korean: "Korean";
                readonly portuguese: "Portuguese";
                readonly spanish: "Spanish";
            };
        }, {
            readonly name: "add_opt4";
            readonly text: "Extract vocals first";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Use original reference file";
                readonly "1": "Extract vocals first";
            };
        }];
    };
    readonly Mega53StemModel: {
        readonly id: 126;
        readonly name: "Mega 53-stem Model";
        readonly active: true;
        readonly group: "Experimental and Misc";
        readonly groupId: 10;
        readonly widget: "single_upload";
        readonly stems: readonly ["vocals", "lead-vocal", "back-vocal", "drums", "kick", "snare", "toms", "hh", "percussion", "tambourine", "timpani", "congas", "triangle", "bells", "glockenspiel", "marimba", "bass", "double-bass", "guitar", "acoustic-guitar", "electric-guitar", "banjo", "mandolin", "ukulele", "dobro", "sitar", "piano", "digital-piano", "harpsichord", "keys", "organ", "accordion", "synth", "strings", "violin", "viola", "cello", "harp", "brass", "trumpet", "trombone", "french-horn", "tuba", "woodwind", "flute", "clarinet", "oboe", "bassoon", "saxophone", "harmonica", "wind", "wind-chimes"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4;
            readonly total: 23;
        };
    };
    readonly UpmixingByJazzpear: {
        readonly id: 137;
        readonly name: "Upmixing by Jazzpear";
        readonly active: true;
        readonly group: "Experimental and Misc";
        readonly groupId: 10;
        readonly widget: "single_upload";
        readonly stems: readonly ["LRF", "CEN", "LFE", "LRS", "upmix-6ch"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.0526;
            readonly total: 38;
        };
    };
    readonly DeEffectVocalsByGilliaan: {
        readonly id: 138;
        readonly name: "DeEffect vocals by gilliaan";
        readonly active: true;
        readonly group: "Experimental and Misc";
        readonly groupId: 10;
        readonly widget: "single_upload";
        readonly stems: readonly [];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.3793;
            readonly total: 58;
        };
    };
    readonly MVSepMultiSpeaker: {
        readonly id: 42;
        readonly name: "MVSep MultiSpeaker (MDX23C)";
        readonly active: true;
        readonly group: "Experimental and Misc";
        readonly groupId: 10;
        readonly widget: "single_upload";
        readonly stems: readonly ["vocal1", "vocal2"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 2;
            readonly total: 6;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Model Type";
            readonly serverKey: "model_type";
            readonly defaultKey: "1";
            readonly choices: {
                readonly "0": "Extract directly from mixture";
                readonly "1": "Extract from vocals part";
            };
        }];
    };
    readonly UniverSR: {
        readonly id: 139;
        readonly name: "UniverSR (Super Resolution)";
        readonly active: true;
        readonly group: "Experimental and Misc";
        readonly groupId: 10;
        readonly widget: "single_upload";
        readonly stems: readonly [];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 2.5538;
            readonly total: 65;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Universal";
                readonly "1": "Speech";
                readonly "2": "Pitbul's EDM";
            };
        }, {
            readonly name: "add_opt2";
            readonly text: "Input sample rate";
            readonly serverKey: "input_sr";
            readonly defaultKey: "8000";
            readonly choices: {
                readonly "0": "Auto";
                readonly "8000": 8000;
                readonly "12000": 12000;
                readonly "16000": 16000;
                readonly "24000": 24000;
            };
        }, {
            readonly name: "add_opt3";
            readonly text: "Guidance scale";
            readonly serverKey: "guidance_scale";
            readonly defaultKey: "1.5";
            readonly choices: {
                readonly "1.0": "1.0";
                readonly "1.1": "1.1";
                readonly "1.2": "1.2";
                readonly "1.3": "1.3";
                readonly "1.4": "1.4";
                readonly "1.5": "1.5";
                readonly "1.6": "1.6";
                readonly "1.7": "1.7";
                readonly "1.8": "1.8";
                readonly "1.9": "1.9";
                readonly "2.0": "2.0";
            };
        }];
    };
    readonly Aspiration: {
        readonly id: 50;
        readonly name: "Aspiration (by Sucial)";
        readonly active: true;
        readonly group: "Experimental and Misc";
        readonly groupId: 10;
        readonly widget: "single_upload";
        readonly stems: readonly ["aspiration", "other"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4;
            readonly total: 1;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Extract directly from mixture";
                readonly "1": "Extract from vocals part";
            };
        }];
    };
    readonly PhantomCentreExtraction: {
        readonly id: 55;
        readonly name: "Phantom Centre extraction";
        readonly active: true;
        readonly group: "Experimental and Misc";
        readonly groupId: 10;
        readonly widget: "single_upload";
        readonly stems: readonly ["center", "wide", "difference", "similarity"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.8;
            readonly total: 5;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "1";
            readonly choices: {
                readonly "0": "Phantom Centre by wesleyr36 (MDX23C)";
                readonly "1": "Phantom Centre by gilliaan (BSRoformer)";
                readonly "2": "Phantom Centre by gilliaan (mdx23c)";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly model_type: "1";
            };
            readonly stems: readonly ["center", "wide"];
        }, {
            readonly match: {
                readonly model_type: "2";
            };
            readonly stems: readonly ["center", "wide"];
        }, {
            readonly match: {
                readonly model_type: "0";
            };
            readonly stems: readonly ["difference", "similarity"];
        }];
    };
    readonly SOME: {
        readonly id: 80;
        readonly name: "SOME (Singing-Oriented MIDI Extractor)";
        readonly active: true;
        readonly group: "Experimental and Misc";
        readonly groupId: 10;
        readonly widget: "single_upload";
        readonly stems: readonly ["some-midi"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 1;
            readonly total: 1;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "How to use";
            readonly serverKey: "extract_type";
            readonly defaultKey: "1";
            readonly choices: {
                readonly "0": "Apply to original file";
                readonly "1": "Extract vocals first";
            };
        }];
    };
    readonly Transkun: {
        readonly id: 113;
        readonly name: "Transkun (Piano -> MIDI)";
        readonly active: true;
        readonly group: "Experimental and Misc";
        readonly groupId: 10;
        readonly widget: "single_upload";
        readonly stems: readonly ["Transkun"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4.4444;
            readonly total: 9;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "How to extract";
            readonly serverKey: "extract_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Extract directly from mixture";
                readonly "1": "Extract piano first";
            };
        }];
    };
    readonly BasicPitch: {
        readonly id: 114;
        readonly name: "Basic Pitch (MIDI Extraction)";
        readonly active: true;
        readonly group: "Experimental and Misc";
        readonly groupId: 10;
        readonly widget: "single_upload";
        readonly stems: readonly ["pitch"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 3;
            readonly total: 4;
        };
    };
    readonly ADTOFPlus: {
        readonly id: 127;
        readonly name: "ADTOF Plus (Drums -> MIDI)";
        readonly active: true;
        readonly group: "Experimental and Misc";
        readonly groupId: 10;
        readonly widget: "single_upload";
        readonly stems: readonly ["kick", "snare", "toms", "hh", "cymbals", "plus"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 3;
            readonly total: 2;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "How to extract";
            readonly serverKey: "extract_type";
            readonly defaultKey: "1";
            readonly choices: {
                readonly "0": "Extract directly from mixture";
                readonly "1": "Extract drums first";
            };
        }];
    };
    readonly Demucs3Model: {
        readonly id: 10;
        readonly name: "Demucs3 Model (vocals, drums, bass, other)";
        readonly active: true;
        readonly group: "Old Models";
        readonly groupId: 1;
        readonly widget: "single_upload";
        readonly stems: readonly ["vocals", "drums", "bass", "other", "instrumental"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 4;
            readonly total: 1;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "1";
            readonly choices: {
                readonly "0": "Demucs3 Model A (Contest Version)";
                readonly "1": "Demucs3 Model B (High Quality) ";
            };
        }];
    };
    readonly MDXAB: {
        readonly id: 7;
        readonly name: "MDX A/B (vocals, drums, bass, other)";
        readonly active: true;
        readonly group: "Old Models";
        readonly groupId: 1;
        readonly widget: "single_upload";
        readonly stems: readonly ["vocals", "bass", "drums", "other"];
        readonly priceCoefficient: 1;
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Vocal model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "3";
            readonly choices: {
                readonly "0": "MDX A (Contest Version)";
                readonly "1": "MDX UVR 2022.01.01 SDR 8.62";
                readonly "2": "MDX UVR 2022.07.25 SDR 8.51";
                readonly "3": "MDX Kimberley Jensen 2023.02.12 SDR: 9.30 (New)";
            };
        }];
    };
    readonly VitLarge23: {
        readonly id: 33;
        readonly name: "Vit Large 23 (vocals, instrum)";
        readonly active: true;
        readonly group: "Old Models";
        readonly groupId: 1;
        readonly widget: "single_upload";
        readonly stems: readonly ["vocals", "other"];
        readonly priceCoefficient: 1;
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "1";
            readonly choices: {
                readonly "0": "v1 (SDR vocals: 9.78)";
                readonly "1": "v2 (SDR vocals: 9.90)";
            };
        }];
    };
    readonly UVRv5Demucs: {
        readonly id: 17;
        readonly name: "UVRv5 Demucs (vocals, music)";
        readonly active: true;
        readonly group: "Old Models";
        readonly groupId: 1;
        readonly widget: "single_upload";
        readonly stems: readonly ["vocals", "instrumental"];
        readonly priceCoefficient: 1;
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Model Type";
            readonly serverKey: "model_type";
            readonly choices: {
                readonly "0": "UVR_Demucs_Model_1";
                readonly "1": "UVR_Demucs_Model_2";
                readonly "2": "UVR_Demucs_Model_Bag";
            };
        }];
    };
    readonly MVSepDNR: {
        readonly id: 18;
        readonly name: "MVSep DNR (music, sfx, speech)";
        readonly active: true;
        readonly group: "Old Models";
        readonly groupId: 1;
        readonly widget: "single_upload";
        readonly stems: readonly ["speech", "music", "sfx", "sum"];
        readonly priceCoefficient: 1;
    };
    readonly MVSepOldVocalModel: {
        readonly id: 19;
        readonly name: "MVSep Old Vocal Model (vocals, music)";
        readonly active: true;
        readonly group: "Old Models";
        readonly groupId: 1;
        readonly widget: "single_upload";
        readonly stems: readonly ["vocals", "instrumental"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 5;
            readonly total: 1;
        };
    };
    readonly Demucs2: {
        readonly id: 13;
        readonly name: "Demucs2 (vocals, drums, bass, other)";
        readonly active: true;
        readonly group: "Old Models";
        readonly groupId: 1;
        readonly widget: "single_upload";
        readonly stems: readonly ["vocals", "drums", "bass", "other", "instrumental"];
        readonly priceCoefficient: 1;
    };
    readonly DannaSep: {
        readonly id: 15;
        readonly name: "Danna Sep (vocals, drums, bass, other)";
        readonly active: true;
        readonly group: "Old Models";
        readonly groupId: 1;
        readonly widget: "single_upload";
        readonly stems: readonly ["vocals", "drums", "bass", "other", "instrumental"];
        readonly priceCoefficient: 1;
    };
    readonly ByteDance: {
        readonly id: 16;
        readonly name: "Byte Dance (vocals, drums, bass, other)";
        readonly active: true;
        readonly group: "Old Models";
        readonly groupId: 1;
        readonly widget: "single_upload";
        readonly stems: readonly ["vocals", "instrumental"];
        readonly priceCoefficient: 1;
    };
    readonly MVSepMelBandRoformer: {
        readonly id: 35;
        readonly name: "MVSep MelBand Roformer (vocals, instrum)";
        readonly active: false;
        readonly group: "Old Models";
        readonly groupId: 1;
        readonly widget: "single_upload";
        readonly stems: readonly [];
        readonly priceCoefficient: 1;
    };
    readonly spleeter: {
        readonly id: 0;
        readonly name: "spleeter";
        readonly active: true;
        readonly group: "Old Models";
        readonly groupId: 1;
        readonly widget: "single_upload";
        readonly stems: readonly ["vocals", "accompaniment"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 5;
            readonly total: 1;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "2 stems (vocals, music)";
                readonly "1": "4 stems (vocals, drums, bass, other)";
                readonly "2": "5 stems (vocals, drums, bass, piano, other)";
            };
        }];
    };
    readonly UnMix: {
        readonly id: 3;
        readonly name: "UnMix";
        readonly active: true;
        readonly group: "Old Models";
        readonly groupId: 1;
        readonly widget: "single_upload";
        readonly stems: readonly ["vocals", "drums", "bass", "other", "instrumental", "noise", "speech"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 1;
            readonly total: 1;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "unmix XL (vocals, drums, bass, other)";
                readonly "1": "unmix HQ (vocals, drums, bass, other)";
                readonly "2": "unmix SD (vocals, drums, bass, other)";
                readonly "3": "unmix SE (vocals, music) - low quality";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly model_type: "0";
            };
            readonly stems: readonly ["bass", "drums", "instrumental", "other", "vocals"];
        }, {
            readonly match: {
                readonly model_type: "3";
            };
            readonly stems: readonly ["noise", "speech"];
        }];
    };
    readonly ZeroShot: {
        readonly id: 14;
        readonly name: "Zero Shot (Query Based) (Low quality)";
        readonly active: true;
        readonly group: "Old Models";
        readonly groupId: 1;
        readonly widget: "single_upload";
        readonly stems: readonly ["vocals", "invert", "other", "bass", "drums"];
        readonly priceCoefficient: 1;
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Model Type";
            readonly serverKey: "vector";
            readonly defaultKey: "2";
            readonly choices: {
                readonly "0": "Bass (MUSDB18HQ AVG)";
                readonly "1": "Drums (MUSDB18HQ AVG)";
                readonly "2": "Vocals (MUSDB18HQ AVG)";
                readonly "3": "Other (MUSDB18HQ AVG)";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly vector: "3";
            };
            readonly stems: readonly ["invert", "other"];
        }, {
            readonly match: {
                readonly vector: "2";
            };
            readonly stems: readonly ["invert", "vocals"];
        }, {
            readonly match: {
                readonly vector: "0";
            };
            readonly stems: readonly ["bass", "invert"];
        }, {
            readonly match: {
                readonly vector: "1";
            };
            readonly stems: readonly ["drums", "invert"];
        }];
    };
    readonly LarsNet: {
        readonly id: 38;
        readonly name: "LarsNet (kick, snare, cymbals, toms, hihat)";
        readonly active: true;
        readonly group: "Old Models";
        readonly groupId: 1;
        readonly widget: "single_upload";
        readonly stems: readonly ["drums", "other", "kick", "snare", "toms", "hihat", "cymbals"];
        readonly priceCoefficient: 1;
        readonly rating: {
            readonly average: 3;
            readonly total: 5;
        };
        readonly fields: readonly [{
            readonly name: "add_opt1";
            readonly text: "Model type";
            readonly serverKey: "model_type";
            readonly defaultKey: "0";
            readonly choices: {
                readonly "0": "Apply Demucs4HT first to get drums";
                readonly "1": "Use as is (audio must contain drums only)";
            };
        }];
        readonly profiles: readonly [{
            readonly match: {
                readonly model_type: "0";
            };
            readonly stems: readonly ["cymbals", "drums", "hihat", "kick", "other", "snare", "toms"];
        }, {
            readonly match: {
                readonly model_type: "1";
            };
            readonly stems: readonly ["cymbals", "hihat", "kick", "snare", "toms"];
        }];
    };
};
//# sourceMappingURL=models.generated.d.ts.map