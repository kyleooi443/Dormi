# Dormi interface system

## Intent

A calm, welcoming household payment workspace for students and their admins. Borrow the restraint, spacing, material hierarchy, and interaction clarity of Apple's interfaces while retaining Dormi's forest palette, typography, and household character.

## Tokens

The implementation source of truth is `src/lib/theme.tsx`.

| Role | Light | Dark |
| --- | --- | --- |
| Canvas | `#f5f7f3` | `#101813` |
| Surface | `#ffffff` | `#1a251e` |
| Subtle surface | `#eef2ec` | `#233128` |
| Main text | `#202b25` | `#edf4ef` |
| Secondary text | `#5c6961` | `#adbbb1` |
| Foreground accent | `#1d5346` | `#a1d5b8` |
| Primary button | `#1d5346` | `#1d5346` |
| Mint | `#d9eee3` | `#23473b` |

Headings use Space Grotesk; body and controls use DM Sans. Money uses tabular figures where supported. Coral, blue, and amber are reserved for categories and contextual feedback. Structural icons use Ionicons exclusively.

## Layout

- Screens compose the shared primitives in `src/components/ui.tsx`.
- Tab content is centered within 1160px; forms within 680px.
- Side-by-side dashboard columns begin at 900px. Bill cards use two columns from 768px and one below that.
- Gutters are 20px on phones and 32px on larger screens. Sections use 24px spacing and cards use 24px padding.
- Small controls have at least 44px touch targets. Larger actions have 52px height.
- The floating glass tab bar is limited to the navigation layer and includes safe-area clearance.
- A visible back action and theme control appear on form screens.

## Interaction and status

Buttons retain their bounds during press feedback. Fields show visible focus, support password managers, and keep labels visible. Filters wrap instead of hiding labels. Form actions show loading and disable duplicate submission.

Only approved payments count as collected or settled. Submitted payments display an in-review status. Rent and utility shares continue to use the existing shared calculation helpers. Default payment amounts follow asynchronously loaded stay-day proration until the renter edits the amount.

## Motion

Use one quiet screen entrance, a chart transition on quarter changes, and subtle tab fades. Animate opacity and transforms only. Honor reduced motion in page entrances, tab navigation, modal navigation, charts, CSS transitions, and toast messages. Avoid looping decoration.

## Verification and screenshots

Use `npm run typecheck`, Expo's web export, and browser checks at 320px, 375px, 768px, 1024px, 1440px, and phone landscape. Review both themes independently.

The `artifacts` folder contains the screenshot gallery and image package. Files prefixed `sample-` use isolated browser fixtures to show populated screens; they are not live household records. The live household was empty during this review. No sample records were written to Supabase.

## References

- [Apple Human Interface Guidelines: Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [React Native Animated](https://reactnative.dev/docs/animated)
- Local UI/UX Pro Max guidance on responsive React Native layouts, accessibility, and motion. Automated design-system search results were treated as suggestions; unrelated marketing patterns and font suggestions were excluded in favor of the existing product rules.
