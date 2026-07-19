# Channel SFX lab report

Generated: 2026-07-19T08:43:59.534Z
ffmpeg: true · ffprobe: true

## radio_key_up

- **a**: score **15** · dur=0.68s · mean=-24.4dB · max=0dB — duration ok 0.68s; mean ok -24.4dB; clip risk max 0.0dB
- **b**: score **23** · dur=0.80s · mean=-31dB · max=-0.6dB — duration ok 0.80s; mean ok -31.0dB; hot peaks -0.6dB
- **c**: score **23** · dur=0.72s · mean=-31.2dB · max=-2.9dB — duration ok 0.72s; mean ok -31.2dB; hot peaks -2.9dB

**Winner: b** (score 23)

```
Motorola-style radio transmit key press: crisp tactile click, subtle relay tick, soft carrier rise, dry, no speech, no music, short stinger only
```

Promoted **raw** winner (norm scored 15)

## radio_key_down

- **a**: score **15** · dur=0.68s · mean=-15.9dB · max=-0.4dB — duration ok 0.68s; mean ok -15.9dB; clip risk max -0.4dB
- **b**: score **15** · dur=0.72s · mean=-25.3dB · max=0dB — duration ok 0.72s; mean ok -25.3dB; clip risk max 0.0dB

**Winner: a** (score 15)

```
Police radio unkey: short button release click and brief soft electronic drop, dry, no voice, no music, clean
```

Promoted **normalized** (29) mean=-20.5dB

## radio_squelch_open

- **a**: score **23** · dur=0.84s · mean=-22.5dB · max=-2.3dB — duration ok 0.84s; mean ok -22.5dB; hot peaks -2.3dB
- **b**: score **29** · dur=0.88s · mean=-24.6dB · max=-3dB — duration ok 0.88s; mean ok -24.6dB; peaks ok -3.0dB

**Winner: b** (score 29)

```
Soft FM radio squelch open whoosh, short noise bloom then calm, handheld transceiver, subtle, dry-ish, no talking
```

Promoted **raw** winner (norm scored 15)

## radio_squelch_tail

- **a**: score **15** · dur=0.72s · mean=-15.3dB · max=-0.3dB — duration ok 0.72s; mean ok -15.3dB; clip risk max -0.3dB
- **b**: score **15** · dur=0.80s · mean=-25.2dB · max=-0.4dB — duration ok 0.80s; mean ok -25.2dB; clip risk max -0.4dB

**Winner: a** (score 15)

```
End of radio transmission squelch tail: short soft static puff that dies immediately, classic two-way radio unkey noise, no voice, no music, subtle
```

Promoted **normalized** (29) mean=-20.4dB

## radio_static_bed

- **a**: score **24** · dur=3.00s · mean=-24.3dB · max=-0.6dB — duration ok 3.00s; mean ok -24.3dB; hot peaks -0.6dB
- **b**: score **-0.3000000000000007** · dur=3.00s · mean=-44.6dB · max=-16.8dB — duration ok 3.00s; too quiet mean -44.6dB; peaks ok -16.8dB
- **c**: score **-11.120000000000001** · dur=2.76s · mean=-9.2dB · max=0dB — duration ok 2.76s; too hot mean -9.2dB; clip risk max 0.0dB

**Winner: a** (score 24)

```
Continuous soft VHF open-channel radio static hiss only, steady low-level white noise bed, police radio monitor speaker, no beeps, no voice, no music, loopable, quiet background ambience, even level
```

Promoted **normalized** (30) mean=-28.4dB

## radio_crackle_soft

- **a**: score **4.5** · dur=0.88s · mean=-31dB · max=-11.4dB — duration ok 0.88s; too quiet mean -31.0dB; peaks ok -11.4dB
- **b**: score **23** · dur=0.84s · mean=-28.3dB · max=-0.6dB — duration ok 0.84s; mean ok -28.3dB; hot peaks -0.6dB

**Winner: b** (score 23)

```
Brief radio interference crackle pops, gentle, handheld radio fringe, dry-ish, no speech
```

Promoted **raw** winner (norm scored 15)

## phone_line_seize

- **a**: score **23** · dur=0.84s · mean=-17.8dB · max=-1.4dB — duration ok 0.84s; mean ok -17.8dB; hot peaks -1.4dB
- **b**: score **-3.5200000000000005** · dur=0.88s · mean=-8.7dB · max=0dB — duration ok 0.88s; too hot mean -8.7dB; clip risk max 0.0dB
- **c**: score **-2.0500000000000007** · dur=0.80s · mean=-38.1dB · max=-9.8dB — duration ok 0.80s; too quiet mean -38.1dB; peaks ok -9.8dB

**Winner: a** (score 23)

```
911 call center headset line connects: soft click then tiny soft connect tone, modern VoIP telephony, clearly a telephone not a walkie-talkie, no ringing loop, no radio squelch, no voice, no music
```

Promoted **normalized** (29) mean=-20.5dB

## phone_line_hangup

- **a**: score **29** · dur=0.68s · mean=-30.2dB · max=-10.4dB — duration ok 0.68s; mean ok -30.2dB; peaks ok -10.4dB
- **b**: score **15** · dur=0.72s · mean=-12.2dB · max=-0.4dB — duration ok 0.72s; mean ok -12.2dB; clip risk max -0.4dB

**Winner: a** (score 29)

```
Soft telephone hang-up click on a headset, call center, single click, NOT radio, no busy signal, no voice, no music
```

Promoted **raw** winner (norm scored 23)

## phone_line_bed

- **a**: score **5.959999999999999** · dur=3.00s · mean=-18.9dB · max=-11.2dB — duration ok 3.00s; too hot mean -18.9dB; peaks ok -11.2dB
- **b**: score **0.6499999999999986** · dur=3.00s · mean=-44.7dB · max=-6.6dB — duration ok 3.00s; too quiet mean -44.7dB; peaks ok -6.6dB
- **c**: score **24** · dur=2.76s · mean=-27.5dB · max=-2.5dB — duration ok 2.76s; mean ok -27.5dB; hot peaks -2.5dB

**Winner: c** (score 24)

```
Soft PSTN open-line atmosphere, quiet broadband hiss suitable under a phone conversation, telephony character, no radio crackle, no voice
```

Promoted **normalized** (30) mean=-28.5dB

## phone_busy_soft

- **a**: score **29** · dur=1.28s · mean=-13.6dB · max=-6.2dB — duration ok 1.28s; mean ok -13.6dB; peaks ok -6.2dB
- **b**: score **29** · dur=1.20s · mean=-14.9dB · max=-7.9dB — duration ok 1.20s; mean ok -14.9dB; peaks ok -7.9dB

**Winner: a** (score 29)

```
Soft American telephone busy signal, two-tone repeating a few times, moderate quiet level, no voice, no music, classic telephony
```

Promoted **normalized** (29) mean=-20.5dB

