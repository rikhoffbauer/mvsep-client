---
title: Supported models and output stems
description: Generated catalog of MVSep algorithms, stem names, and option-dependent output variants.
---

# MVSep model catalog

This catalog is generated from the public MVSep API with `bun run models:update`.
Every row is also available as a typed descriptor for `separate(Models.<name>, options)`.
The playground ships with this snapshot and can refresh the live list.

**Important:** Published outputs are *hints*, not guarantees. Some depend on model options.
Option-dependent observed profiles are included in the generated descriptors and used by the visual graph.
The runner checks the *actual filenames* before feeding downstream steps.
Models without published output names have no guessed stem ports.

**Snapshot:** 122 algorithms; 121 active; 117 have named outputs; 37 have option-dependent output profiles.

| SDK model | ID | Display name | Published output names (union of observed variants) | Output variants | Active |
| --- | ---: | --- | --- | ---: | --- |
| `Models.EnsembleVocalsInstrum` | 26 | Ensemble (vocals, instrum) | `vocals`, `other` | 3 | Yes |
| `Models.EnsembleVocalsInstrumBassDrumsOther` | 28 | Ensemble (vocals, instrum, bass, drums, other) | `vocals`, `instrum`, `bass`, `drums`, `other`, `piano`, `guitar`, `bass-bsroformer-sw`, `bass-scnet-xl`, `drums-bsroformer-sw`, `drums-melroformer`, `drums-scnet`, `instrum-bs-roformer-v1`, `instrum-bs-roformer-v2`, `instrum-max-fft`, `instrum-mel-roformer`, `instrum-min-fft`, `instrum-scnet-xl-ihf`, `vocals-bs-roformer-v1`, `vocals-bs-roformer-v2`, `vocals-bsroformer-sw`, `vocals-max-fft`, `vocals-mel-roformer`, `vocals-min-fft`, `vocals-scnet-xl-ihf` | 2 | Yes |
| `Models.EnsembleAllIn` | 30 | Ensemble All-In (vocals, bass, drums, piano, guitar, lead/back vocals, other) | `vocals`, `instrum`, `bass`, `drums`, `guitar`, `piano`, `strings`, `wind`, `other-no-vocals-bass-drums`, `vocals-lead-v1`, `vocals-lead-v2`, `vocals-back`, `back-instrum`, `drums-kick`, `drums-snare`, `drums-cymbals`, `drums-toms`, `drums-hh`, `drums-ride`, `drums-crash` | 0 | Yes |
| `Models.BSRoformerSW` | 63 | BS Roformer SW (vocals, bass, drums, guitar, piano, other) | `vocals`, `bass`, `drums`, `guitar`, `piano`, `other`, `instrum` | 0 | Yes |
| `Models.Demucs4_HT` | 20 | Demucs4 HT (vocals, drums, bass, other) | `vocals`, `drums`, `bass`, `other`, `instrumental`, `guitar`, `piano` | 3 | Yes |
| `Models.BSRoformer` | 40 | BS Roformer (vocals, instrumental) | `vocals`, `other` | 0 | Yes |
| `Models.BSPolarFormer` | 123 | BS PolarFormer (vocals, instrumental) | `instrumental`, `instrumental-fullness-level-1`, `vocals`, `vocals-fullness-level-1`, `other` | 2 | Yes |
| `Models.MelBandRoformer` | 48 | MelBand Roformer (vocals, instrumental) | `vocals`, `other` | 0 | Yes |
| `Models.MDX23C` | 25 | MDX23C (vocals, instrumental) | `vocals`, `other` | 0 | Yes |
| `Models.SCNet` | 46 | SCNet (vocals, instrumental) | `vocals`, `other` | 0 | Yes |
| `Models.MDXB` | 23 | MDX B (vocals, instrumental) | `vocals`, `instrum` | 0 | Yes |
| `Models.UltimateVocalRemoverVR` | 9 | Ultimate Vocal Remover VR (vocals, music) | `vocals`, `instruments`, `other`, `vocalsback`, `drums` | 10 | Yes |
| `Models.Demucs4Vocals2023` | 27 | Demucs4 Vocals 2023 (vocals, instrum) | `vocals`, `instrumental` | 0 | Yes |
| `Models.MVSepKaraoke` | 49 | MVSep Karaoke (lead/back vocals) | `vocals-lead`, `vocals-back`, `instrum-only`, `back-instrum`, `vocals-full` | 6 | Yes |
| `Models.MDXBKaraoke` | 12 | MDX-B Karaoke (lead/back vocals) | `vocalslead`, `instrum`, `instrumonly`, `vocalsback`, `vocalsfull` | 2 | Yes |
| `Models.MVSepCrowdRemoval` | 34 | MVSep Crowd removal (crowd, other) | `crowd`, `other`, `crowd-mdx23c`, `crowd-melroformer` | 4 | Yes |
| `Models.MedleyVox` | 53 | Medley Vox (Multi-singer separation) | `vocals1`, `vocals2` | 0 | Yes |
| `Models.MVSepMultichannelBS` | 43 | MVSep Multichannel BS (vocals, instrumental) | `vocals`, `other` | 0 | Yes |
| `Models.MVSepMaleFemaleSeparation` | 57 | MVSep Male/Female separation | `male`, `female`, `instrumental`, `instrumental-plus-female`, `instrumental-plus-male`, `vocals` | 2 | Yes |
| `Models.MVSepChoir` | 112 | MVSep Choir (choir, other) | `choir`, `other`, `instrum`, `other-vocals`, `vocals` | 2 | Yes |
| `Models.MVSepSATBChoir` | 111 | MVSep SATB Choir (soprano, alto, tenor, bass) | `soprano`, `alto`, `tenor`, `bass`, `instrum`, `vocals` | 2 | Yes |
| `Models.MVSepDrums` | 44 | MVSep Drums (drums, other) | `drums`, `other`, `vocals`, `drums-bsroformer-sw`, `drums-melroformer`, `drums-scnet` | 4 | Yes |
| `Models.MVSepBass` | 41 | MVSep Bass (bass, other) | `bass`, `other`, `vocals`, `bass-bsroformer-sw`, `bass-scnet-xl` | 5 | Yes |
| `Models.MVSep_Synth` | 88 | MVSep Synth (synth, other) | `synth`, `other`, `instrum`, `vocals` | 2 | Yes |
| `Models.DrumSep` | 37 | DrumSep (4-6 stems: kick, snare, cymbals, toms, ride, hh, crash) | `drums`, `kick`, `snare`, `toms`, `ride`, `hh`, `crash`, `residual`, `cymbals`, `crash-ride`, `hihat`, `crash_ride` | 8 | Yes |
| `Models.MVSepPiano` | 29 | MVSep Piano (piano, other) | `piano`, `other` | 0 | Yes |
| `Models.MVSepDigitalPiano` | 79 | MVSep Digital Piano (digital-piano, other) | `digital-piano`, `other`, `all-piano`, `no-piano`, `other-piano` | 2 | Yes |
| `Models.MVSepKeys` | 106 | MVSep Keys (keys, other) | `keys`, `other` | 0 | Yes |
| `Models.MVSepOrgan` | 58 | MVSep Organ (organ, other) | `organ`, `other` | 0 | Yes |
| `Models.MVSepHarpsichord` | 91 | MVSep Harpsichord (harpsichord, other) | `harpsichord`, `other` | 0 | Yes |
| `Models.MVSepAccordion` | 99 | MVSep Accordion (accordion, other) | `accordion`, `other` | 0 | Yes |
| `Models.MVSepVibraphone` | 129 | MVSep Vibraphone | `vibes`, `other` | 0 | Yes |
| `Models.MVSepMetalBars` | 130 | MVSep Metal Bars | `metal-bars`, `other` | 0 | Yes |
| `Models.MVSepRhodes` | 131 | MVSep Rhodes | `rhodes`, `other` | 0 | Yes |
| `Models.MVSepClavinet` | 135 | MVSep Clavinet | `clavinet`, `other` | 0 | Yes |
| `Models.MVSepMellotron` | 136 | MVSep Mellotron | `mellotron`, `other` | 0 | Yes |
| `Models.MVSepGuitar` | 31 | MVSep Guitar (guitar, other) | `guitar`, `other` | 0 | Yes |
| `Models.MVSepAcousticGuitar` | 66 | MVSep Acoustic Guitar (acoustic-guitar, other) | `acoustic-guitar`, `other`, `all-guitar`, `no-guitar`, `other-guitar` | 2 | Yes |
| `Models.MVSepElectricGuitar` | 81 | MVSep Electric Guitar (electric-guitar, other) | `electric-guitar`, `other`, `all-guitar`, `no-guitar`, `other-guitar` | 2 | Yes |
| `Models.MVSepLeadRhythmGuitar` | 101 | MVSep Lead/Rhythm Guitar (lead-guitar, rhythm-guitar) | `lead-guitar`, `rhythm-guitar`, `all-guitar`, `no-guitar` | 0 | Yes |
| `Models.MVSepPedalSteelGuitar` | 124 | MVSep Pedal Steel Guitar | `pedal-steel-guitar`, `other` | 0 | Yes |
| `Models.MVSepPluckedStrings` | 102 | MVSep Plucked Strings (plucked-strings, other) | `plucked-strings`, `other` | 0 | Yes |
| `Models.MVSepHarp` | 72 | MVSep Harp (harp, other) | `harp`, `other` | 0 | Yes |
| `Models.MVSepMandolin` | 74 | MVSep Mandolin (mandolin, other) | `mandolin`, `other` | 0 | Yes |
| `Models.MVSepBanjo` | 83 | MVSep Banjo (banjo, other) | `banjo`, `other` | 0 | Yes |
| `Models.MVSepSitar` | 90 | MVSep Sitar (sitar, other) | `sitar`, `other` | 0 | Yes |
| `Models.MVSepUkulele` | 96 | MVSep Ukulele (ukulele, other) | `ukulele`, `other` | 0 | Yes |
| `Models.MVSepDobro` | 97 | MVSep Dobro (dobro, other) | `dobro`, `other` | 0 | Yes |
| `Models.MVSepBowedStrings` | 52 | MVSep Bowed Strings (strings, other) | `strings`, `other` | 0 | Yes |
| `Models.MVSepViolin` | 65 | MVSep Violin (violin, other) | `violin`, `other` | 0 | Yes |
| `Models.MVSepViola` | 69 | MVSep Viola (viola, other) | `viola`, `other`, `all-strings`, `no-strings`, `other-strings` | 2 | Yes |
| `Models.MVSepCello` | 70 | MVSep Cello (cello, other) | `cello`, `other`, `all-strings`, `no-strings`, `other-strings` | 2 | Yes |
| `Models.MVSepDoubleBass` | 73 | MVSep Double Bass (double-bass, other) | `double-bass`, `other`, `all-strings`, `no-strings`, `other-strings` | 2 | Yes |
| `Models.MVSepWind` | 54 | MVSep Wind (wind, other) | `wind`, `other`, `vocals` | 2 | Yes |
| `Models.MVSepBrass` | 107 | MVSep Brass (brass, other) | `brass`, `other`, `all-wind`, `no-wind`, `other-wind` | 2 | Yes |
| `Models.MVSepWoodwind` | 108 | MVSep Woodwind (woodwind, other) | `woodwind`, `other`, `all-wind`, `no-wind`, `other-wind` | 2 | Yes |
| `Models.MVSepSaxophone` | 61 | MVSep Saxophone (saxophone, other) | `saxophone`, `other`, `saxophone-melroformer`, `saxophone-scnet` | 4 | Yes |
| `Models.MVSepFlute` | 67 | MVSep Flute (flute, other) | `flute`, `other`, `all-wind`, `no-wind`, `other-wind` | 2 | Yes |
| `Models.MVSepTrumpet` | 71 | MVSep Trumpet (trumpet, other) | `trumpet`, `other`, `all-wind`, `no-wind`, `other-wind` | 2 | Yes |
| `Models.MVSepTrombone` | 75 | MVSep Trombone (trombone, other) | `trombone`, `other`, `all-wind`, `no-wind`, `other-wind` | 2 | Yes |
| `Models.MVSepOboe` | 77 | MVSep Oboe (oboe, other) | `oboe`, `other`, `all-wind`, `no-wind`, `other-wind` | 2 | Yes |
| `Models.MVSepClarinet` | 78 | MVSep Clarinet (clarinet, other) | `clarinet`, `other`, `all-wind`, `no-wind`, `other-wind` | 2 | Yes |
| `Models.MVSepFrenchHorn` | 82 | MVSep French Horn (french-horn, other) | `french-horn`, `other`, `all-wind`, `no-wind`, `other-wind` | 2 | Yes |
| `Models.MVSepHarmonica` | 87 | MVSep Harmonica (harmonica, other) | `harmonica`, `other` | 0 | Yes |
| `Models.MVSepTuba` | 92 | MVSep Tuba (tuba, other) | `tuba`, `other` | 0 | Yes |
| `Models.MVSepBassoon` | 93 | MVSep Bassoon (bassoon, other) | `bassoon`, `other` | 0 | Yes |
| `Models.MVSepBagpipes` | 116 | MVSep Bagpipes (bagpipes , other) | `bagpipes`, `other` | 0 | Yes |
| `Models.MVSepWhistle` | 132 | MVSep Whistle | `whistle`, `other` | 0 | Yes |
| `Models.MVSepPercussion` | 105 | MVSep Percussion (percussion, other) | `percussion`, `other` | 0 | Yes |
| `Models.MVSepTambourine` | 76 | MVSep Tambourine (tambourine, other) | `tambourine`, `other` | 0 | Yes |
| `Models.MVSepMarimba` | 84 | MVSep Marimba (marimba, other) | `marimba`, `other` | 0 | Yes |
| `Models.MVSepGlockenspiel` | 85 | MVSep Glockenspiel (glockenspiel, other) | `glockenspiel`, `other` | 0 | Yes |
| `Models.MVSepTimpani` | 86 | MVSep Timpani (timpani, other) | `timpani`, `other` | 0 | Yes |
| `Models.MVSepTriangle` | 89 | MVSep Triangle (triangle, other) | `triangle`, `other` | 0 | Yes |
| `Models.MVSepCongas` | 94 | MVSep Congas (congas , other) | `congas`, `other` | 0 | Yes |
| `Models.MVSepBells` | 95 | MVSep Bells (bells, other) | `bells`, `other` | 0 | Yes |
| `Models.MVSepWindChimes` | 98 | MVSep Wind Chimes (wind-chimes, other) | `wind-chimes`, `other` | 0 | Yes |
| `Models.MVSepXylophone` | 109 | MVSep Xylophone (xylophone, other) | `xylophone`, `other` | 0 | Yes |
| `Models.MVSepCelesta` | 110 | MVSep Celesta (celesta, other) | `celesta`, `other` | 0 | Yes |
| `Models.MVSepClap` | 133 | MVSep Clap | `clap`, `other` | 0 | Yes |
| `Models.MVSepCowbell` | 128 | MVSep Cowbell | `cowbell`, `other` | 0 | Yes |
| `Models.MVSepDemucs4HTDNR` | 24 | MVSep Demucs4HT DNR (speech, music, effects) | `dialog`, `music`, `effect`, `instrumental` | 0 | Yes |
| `Models.BandItPlus` | 36 | BandIt Plus (speech, music, effects) | `speech`, `music`, `effects` | 0 | Yes |
| `Models.BandItV2` | 45 | BandIt v2 (speech, music, effects) | `speech`, `music`, `sfx` | 0 | Yes |
| `Models.MVSepDnRV3` | 56 | MVSep DnR v3 (speech, music, effects) | `speech`, `music`, `sfx` | 3 | Yes |
| `Models.MVSepBraam` | 117 | MVSep Braam | `braam`, `other` | 0 | Yes |
| `Models.MVSepRisers` | 125 | MVSep Risers | `risers`, `other` | 0 | Yes |
| `Models.MVSepFX` | 122 | MVSep FX | `fx`, `other` | 0 | Yes |
| `Models.ApolloEnhancers` | 51 | Apollo Enhancers (by JusperLee, Lew, baicai1145) | `restored` | 0 | Yes |
| `Models.ReverbRemoval` | 22 | Reverb Removal (noreverb) | `noreverb`, `reverb`, `dry`, `other`, `instrum`, `restored`, `vocals` | 12 | Yes |
| `Models.DeNoiseByAufr33AndGabox` | 47 | DeNoise by aufr33 and gabox | `dry`, `other` | 0 | Yes |
| `Models.AudioSR` | 59 | AudioSR (Super Resolution) | `restored` | 0 | Yes |
| `Models.FlashSR` | 60 | FlashSR (Super Resolution) | `restored` | 0 | Yes |
| `Models.Whisper` | 39 | Whisper (extract text from audio) | _Not published_ | 0 | Yes |
| `Models.Parakeet` | 64 | Parakeet (extract text from audio) | _Not published_ | 0 | Yes |
| `Models.VibeVoice` | 103 | VibeVoice (Voice Cloning) | `generated`, `speech-sample` | 0 | Yes |
| `Models.Qwen3TTS` | 120 | Qwen3-TTS (Voice Cloning) | `generated`, `reference` | 0 | Yes |
| `Models.Mega53StemModel` | 126 | Mega 53-stem Model | `vocals`, `lead-vocal`, `back-vocal`, `drums`, `kick`, `snare`, `toms`, `hh`, `percussion`, `tambourine`, `timpani`, `congas`, `triangle`, `bells`, `glockenspiel`, `marimba`, `bass`, `double-bass`, `guitar`, `acoustic-guitar`, `electric-guitar`, `banjo`, `mandolin`, `ukulele`, `dobro`, `sitar`, `piano`, `digital-piano`, `harpsichord`, `keys`, `organ`, `accordion`, `synth`, `strings`, `violin`, `viola`, `cello`, `harp`, `brass`, `trumpet`, `trombone`, `french-horn`, `tuba`, `woodwind`, `flute`, `clarinet`, `oboe`, `bassoon`, `saxophone`, `harmonica`, `wind`, `wind-chimes` | 0 | Yes |
| `Models.UpmixingByJazzpear` | 137 | Upmixing by Jazzpear | `LRF`, `CEN`, `LFE`, `LRS`, `upmix-6ch` | 0 | Yes |
| `Models.DeEffectVocalsByGilliaan` | 138 | DeEffect vocals by gilliaan | _Not published_ | 0 | Yes |
| `Models.MVSepMultiSpeaker` | 42 | MVSep MultiSpeaker (MDX23C) | `vocal1`, `vocal2` | 0 | Yes |
| `Models.UniverSR` | 139 | UniverSR (Super Resolution) | _Not published_ | 0 | Yes |
| `Models.Aspiration` | 50 | Aspiration (by Sucial) | `aspiration`, `other` | 0 | Yes |
| `Models.PhantomCentreExtraction` | 55 | Phantom Centre extraction | `center`, `wide`, `difference`, `similarity` | 3 | Yes |
| `Models.SOME` | 80 | SOME (Singing-Oriented MIDI Extractor) | `some-midi` | 0 | Yes |
| `Models.Transkun` | 113 | Transkun (Piano -> MIDI) | `Transkun` | 0 | Yes |
| `Models.BasicPitch` | 114 | Basic Pitch (MIDI Extraction) | `pitch` | 0 | Yes |
| `Models.ADTOFPlus` | 127 | ADTOF Plus (Drums -> MIDI) | `kick`, `snare`, `toms`, `hh`, `cymbals`, `plus` | 0 | Yes |
| `Models.Demucs3Model` | 10 | Demucs3 Model (vocals, drums, bass, other) | `vocals`, `drums`, `bass`, `other`, `instrumental` | 0 | Yes |
| `Models.MDXAB` | 7 | MDX A/B (vocals, drums, bass, other) | `vocals`, `bass`, `drums`, `other` | 0 | Yes |
| `Models.VitLarge23` | 33 | Vit Large 23 (vocals, instrum) | `vocals`, `other` | 0 | Yes |
| `Models.UVRv5Demucs` | 17 | UVRv5 Demucs (vocals, music) | `vocals`, `instrumental` | 0 | Yes |
| `Models.MVSepDNR` | 18 | MVSep DNR (music, sfx, speech) | `speech`, `music`, `sfx`, `sum` | 0 | Yes |
| `Models.MVSepOldVocalModel` | 19 | MVSep Old Vocal Model (vocals, music) | `vocals`, `instrumental` | 0 | Yes |
| `Models.Demucs2` | 13 | Demucs2 (vocals, drums, bass, other) | `vocals`, `drums`, `bass`, `other`, `instrumental` | 0 | Yes |
| `Models.DannaSep` | 15 | Danna Sep (vocals, drums, bass, other) | `vocals`, `drums`, `bass`, `other`, `instrumental` | 0 | Yes |
| `Models.ByteDance` | 16 | Byte Dance (vocals, drums, bass, other) | `vocals`, `instrumental` | 0 | Yes |
| `Models.MVSepMelBandRoformer` | 35 | MVSep MelBand Roformer (vocals, instrum) | _Not published_ | 0 | No |
| `Models.spleeter` | 0 | spleeter | `vocals`, `accompaniment` | 0 | Yes |
| `Models.UnMix` | 3 | UnMix | `vocals`, `drums`, `bass`, `other`, `instrumental`, `noise`, `speech` | 2 | Yes |
| `Models.ZeroShot` | 14 | Zero Shot (Query Based) (Low quality) | `vocals`, `invert`, `other`, `bass`, `drums` | 4 | Yes |
| `Models.LarsNet` | 38 | LarsNet (kick, snare, cymbals, toms, hihat) | `drums`, `other`, `kick`, `snare`, `toms`, `hihat`, `cymbals` | 2 | Yes |

Refresh with `bun run models:update`. Then run `bun run test` and `cd docs && bun run build`.
For newer models not yet in the snapshot, use `modelFromAlgorithm(await client.getAlgorithm(id))`.
