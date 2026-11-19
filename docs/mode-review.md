# Obelisk mode review

This review covers the six visuals and four games available in the remote, including their rendering, input, layout, and start/stop behavior.

## Visuals

| Mode | Code and design review | Next improvement |
| --- | --- | --- |
| [Billboard](../packages/obelisk-server/modes/billboard.index.ts) | The original fixed streetcar and arrival positions assumed a 128-pixel-wide strip. It now chooses side-by-side, stacked, or alternating content and cancels TTC polling when the mode stops. A failed fetch and a feed with no upcoming service still both show the same placeholder. | Make the minutes the first thing a viewer reads. Keep the last known estimate only within a defined freshness window, and give stale data and no service distinct treatments. Check legibility across a room on a short strip. |
| [Clock](../packages/obelisk-server/modes/clock.index.ts) | The remote offers three bitmap font families and preset or custom colors. Clock selects a suitable size and uses a shortened time when the full readout cannot fit. | Add a tiny-panel indicator when only hours or minutes fit. |
| [Lava Lamp](../packages/obelisk-server/modes/lava-lamp.index.ts) | Colored blobs rise, fall, and merge across the panel. The remote adjusts palette, speed, and blob count during playback. | Check color gradients and shadow detail on a calibrated physical panel. |
| [Pulse](../packages/obelisk-server/modes/pulse.index.ts) | A fixed phase buffer drives the LED sparkle at 25 Hz. The remote controls color and intensity from 0 to 100%. | Compare a coherent pulse wave with the sparkle pattern on the physical panel. |
| [Starry Night](../packages/obelisk-server/modes/space.index.ts) | Stars stay in place and twinkle at different rates. A shooting star crosses part of the panel every so often. Both effects use the actual panel dimensions. | Tune star density and meteor legibility on compact physical panels. |
| [Sunlight](../packages/obelisk-server/modes/sunlight.index.ts) | An animated sunset gradient shifts into indigo and deep blue, then fades to black by local midnight. Daytime and late night are blank, with no frame loop. | Tune the dusk palette and intensity on the installed LEDs. |

## Games

| Mode | Code and design review | Next improvement |
| --- | --- | --- |
| [Lightcycles](../packages/obelisk-server/modes/lightcycles.index.ts) | The old spawn coordinates were outside compact panels, and movement and rendering ran separately. Spawns and trail lengths now use the configured area, and same-cell collisions are resolved from a single snapshot. The riders are all computer-driven. | Label the current experience as autoplay. For a playable mode, add two-player steering, a ready countdown, and a clear final-rider result. Keep an autonomous preview available as a separate start choice. |
| [Stack Duel](../packages/obelisk-server/games/stack-duel.ts) | Solo or two-player falling blocks. Rivals share a piece order and send pressure rows with multi-line clears. | Try pressure timing and piece legibility on the real panel. |
| [Fleet Strike](../packages/obelisk-server/games/fleet-strike.ts) | Two phones each show a private fleet and targeting grid. The panel stages each shot as a launch, flight, and impact. | Check impact colors and caption legibility on the installed LEDs. |
| [Pong](../packages/obelisk-server/modes/pong.index.ts) | The original step and scoring logic depended on the strip geometry and used inconsistent player indices. Motion, paddles, scores, and win text now fit the available panel with scoring credited to the correct side. Both sides can still fall back to computer control. | Separate joining from restarting so a second controller can enter an active round. Show which paddle a phone controls, add a ready or serve cue, and compare rally speeds on short and wide layouts. |

## Runtime and configurations

- The server activates one mode at a time. **Turn display off** deactivates it, aborts pending Billboard work, and blanks the panel. Use **OBELISK_START_MODE=off** to leave the display off at startup. Clock still serves as the default for existing setups.
- Static visuals do not schedule another frame after drawing. Animated effects and games use bounded loops. Simulator frames are delivered only when the display view has subscribers, and a connecting viewer can still read the latest frame.
- **OBELISK_SIM_LAYOUT** accepts tile columns and rows followed by horizontal chain and vertical parallel counts. The simulator tests cover 128 × 16, 8 × 8, 16 × 8, 32 × 32, and 16 × 48. The compact and stacked cases exercise every remote mode and verify that turning the display off stops frame updates.
- The reviewed modes run through both drawing backends, but the automated checks use the software matrix. Confirm GPIO mapping, brightness, frame cadence, legibility, and input latency on a physical Pi installation.
- The dormant [DripClock](../packages/obelisk-server/modes/drip-clock.index.ts) and [Pac prototype](../packages/obelisk-server/_pac/index.ts) are outside the current mode registry. DripClock retains completed timers and depends on native bindings. Pac assumes a 128-pixel stride and leaves a very long timeout alive. If either is restored, apply the same layout and lifecycle contract first.

## Fleet Strike artwork

The cutscenes use a 41 × 9 resample of the ImageGen broadside. The remote uses the broadside, overhead ship, and sea texture from `packages/obelisk-client/public/fleet`. ImageGen generated the three sources using these prompts.

### Broadside

Use case: stylized-concept. Asset type: realistic game sprite for a 128×16 RGB LED battleship arcade, broadside source. Create one single fictional mid-century steel battleship viewed exactly side-on in true orthographic profile at its waterline, bow points RIGHT, whole ship from squared stern to raked prow entirely in frame with tight even margins. The long, low steel hull takes most of the width, straight upper deck, two chunky forward gun turrets clearly aimed right, a stepped armored bridge amidships, short funnels aft, a narrow mast with a prominent dark radar crossbar. Realistic naval architecture and proportions. Strong clean low-frequency silhouette that remains readable reduced to about 39×10 pixels. Semi-realistic, crisp shaded steel blue and gunmetal, midnight-blue upper faces, cool gray rim light on the bridge and deck, a restrained rust-red boot stripe, pale gray details. Flat neutral overhead and left directional soft light. Isolated on true transparent background. DO NOT add water, waves, reflections, smoke, crew, land, text, flags, insignia, numbers, horizon, drop shadow, sea foam, or any element outside the ship. Landscape.

### Overhead ship

Use case: stylized-concept. Game sprite, true transparent background. Show one fictional mid-century steel warship with battleship silhouette seen from a strict vertically overhead orthographic camera, bow pointing exactly RIGHT. Ship lies flat horizontally in image, entirely visible bow to stern, isolated cutout. Make the shape readable at 90 CSS pixels long: wide easily distinguished steel-blue hull, a pointed cream-gray bow, squared stern, dark armored deck, two clear chunky forward turrets and broad bridge block, a few lighter deck edges and details. Ship proportions are 4:1, angular silhouette, realistic illustrative metal handling, no perspective or camera tilt, neutral low sunlight, high enough tonal contrast to read on dark teal water. No ocean, wake, background, drop shadow, flag, text, badges, serial numbers, UI, framing, or second ship. Landscape composition.

### Water

Use case: photorealistic-natural. Asset type: seamless-feeling ocean surface background for a phone-based naval targeting grid. Photograph open moderately calm deep slate blue and muted teal seawater at dusk under overcast light from straight overhead. Subtle long ripples and a few muted bands of turquoise reflection across the dark waves. Use low and very even contrast for a screen backdrop beneath thin grid lines. A little documentary texture. Fill the entire square edge to edge with water, no sky or horizon line, no shore, no ship, no words, no lens effects, no bright foam, no framing. Square.

## 3D preview textures

The room uses built-in ImageGen textures stored in `packages/obelisk-client/public/textures`. The oak normal map uses the color texture as its visual reference, with low strength in the room lighting.

### Oak color

Use case: photorealistic-natural. Generate one production texture image for an interactive 3D simulation of a handmade RGB LED sign mounted on a wood wall. Square, true flat physically based ALBEDO material scan of natural medium honey-colored European oak panel wood. Straight-on orthographic macro of uninterrupted, naturally uneven, fine vertically flowing oak wood grain that will be used across individual narrow vertical boards. Natural but refined satin oiled finish. Handled as a single uninterrupted material, no boards, no plank seams, no bevels, no holes, no wall, no visible room, no borders. Broad oak ray fleck, mostly straight fine grain with a few quiet cathedrals, enough variation to register at a distance, subtle pores, small believable variations only. Even neutral diffuse illumination, no baked cast shadows, no gradients, no hotspot, no directional specular reflection. Medium warm ochre brown rather than dark red or bright yellow. Full bleed edge to edge, image must read as an orthographic albedo sample, no words or other elements. Make top/bottom and left/right edges approximately seamless for repeat tiling.

### Oak normal

Image 1 is the existing oak ALBEDO material and defines the exact grain coordinates and orientation. Generate the corresponding production tangent-space OpenGL (+Y) NORMAL MAP, with identical framing, aspect ratio and grain locations and no shift, rescale, rotation, mirroring or added grain. The entire canvas is RGB encoded surface-normal data. The neutral dominant color is RGB(128,128,255), blue with low-amplitude red/green deviations along the two sides of shallow oak pores and in the tight grain grooves. Use subtle red-green signed pairs across microscopic grooves like physically plausible relief, not a color tint of the albedo; broad dark albedo streaks do not have exaggerated depth. Keep blue channel high, neutral average red and green at 128. No scene illumination, no text, no frames, no baked light or glare, no perspective. Wood is smoothly sanded. This is a normal map for Three.js and needs to preserve small matched relief on the light oak wall.

### Concrete color

Use case: photorealistic-natural. Square photo-real production albedo texture for large warm gray polished concrete interior floor, beige-gray limestone aggregate in satin sealed concrete, refined but imperfections visible as fine subtle flecks in a restrained warm gray palette. Empty material swatch, ortho straight down, texture only as a continuous surface. Fine scale, uniform soft neutral light, no visible directional lighting, no glare, no perspective or faces. No large contrast, no object, no planks, no bevel or discrete stones, no tile seams, approximate seamless edges, no lettering.


### Upholstery

Generate one square photoreal PBR albedo scan for the upholstery of a modern low-profile lounge couch in a dark media room. Fine tactile heathered charcoal with a muted olive/espresso tint, elegant dense wool-linen cross weave, tiny warm and cool flecks, medium charcoal neutral value so it can be darkened in the renderer. Square full-bleed orthographic textile material sample with approximately seamless edges; weave at realistic small scale. Planar sample no fabric folds, seams, pillows, holes, furniture silhouette, emboss, cast shadow, bright reflections, text, or directional lighting. Even neutral diffuse light; capture subtle credible fibers.


### Starry Night poster

ImageGen prompt. Create a landscape 3:2 macro of a fine RGB LED grid with sparse cyan, indigo, and white stars and one icy blue shooting star. Keep the bottom quarter nearly black for the title overlay, with no typography or spacecraft.
