# Grid

## Intent
Full-length grid lines warped by a shared 2D displacement field (`offset(u, v)`),
so horizontal and vertical lines stay connected where they cross.
Structure: pick line color → walk along the line → displace each point.

## Ideas to try
- Vary stroke weight along each line (draw segments instead of one shape)
- Mouse as the ripple center in `radial`
- Combine fields: `radial + noise`, or multiply amplitude by distance from center (a lens)
- Uneven spacing: `a = ease.inOutCubic(i / (lines - 1))` bunches lines toward the edges
- Diagonal families (rotate the whole thing 45°) or a third family for a triangular grid
- Draw only every other segment (dashes) driven by `k`
- Color along the line instead of per line (gradient by displacement magnitude)
- `p.blendMode(p.ADD)` with two slightly offset grids for a chromatic look
