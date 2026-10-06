<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Use the shared movies query's date, starting-showtime, and ID order for every schedule view; derive film numbers from that order, not database IDs, so booking labels match the schedule.
- Keep poster-only CDN pointers in the shared POSTERS map; crop supplied card screenshots to artwork without resampling so controls are not duplicated and source pixels are preserved.
