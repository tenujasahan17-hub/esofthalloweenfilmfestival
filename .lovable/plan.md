# Improve movie poster presentation

## Scope
- Keep all movie details, dates, times, seat availability, and booking behavior unchanged.
- Preserve the existing cinematic Halloween styling.

## Changes
- Show every movie card poster with its complete original composition instead of cropping it.
- Redesign the booking dialog so the selected movie’s correctly matched poster is large and prominent before seat selection.
- Keep that poster visible throughout the booking steps, with responsive sizing for desktop and mobile.
- Use aspect-ratio-safe rendering (`object-contain`), high-quality browser rendering, and stable poster dimensions to avoid stretching or layout shifts.
- Update the confirmed ticket preview so its poster is also complete rather than cropped.

## Verification
- Open multiple different films and confirm each displays its own poster.
- Check desktop and mobile layouts for full, sharp, uncropped posters and usable booking controls.
- Confirm the app builds cleanly and no booking behavior changed.

## Technical details
- Changes are limited to the festival page and booking dialog presentation.
- Existing CDN poster sources remain unchanged; display quality will use each source at its highest available resolution without added compression.
