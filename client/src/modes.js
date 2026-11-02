// Display text only. The real rules are enforced by the server.
export const MODES = {
  classic:  { icon: '🍌', title: 'Classic',     tries: 3, desc: 'Three tries and three hints. Steady and relaxed.', rules: 'Points ×1' },
  timed:    { icon: '⏱️', title: 'Time attack', tries: 2, desc: '15 seconds per puzzle and two tries.',            rules: 'Points ×1.5' },
  survival: { icon: '🔥', title: 'One life',    tries: 1, desc: 'One try, no hints. Miss and your streak is gone.', rules: 'Points ×2' },
  practice: { icon: '🎓', title: 'Practice',    tries: 5, desc: 'Five tries and free hints to learn the patterns.', rules: 'No points scored' },
};
export const MODE_LIST = Object.keys(MODES);
