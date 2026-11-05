# How to actually learn, not just look busy

## Hours are the minimum, not the goal
Two hours a day is like showing up at the gym. Without it you won’t grow, but the hours alone prove nothing. Two hours of videos at 2x speed and two hours of solving problems look the same on a timer.

## The real goal is a result by the end of the week
At the start of the week, write down what you’ll have done by Sunday. A good goal can be checked with an artifact: code, solved problems, a link.

Bad: “learn goroutines”.
Good: “write a worker pool that downloads 20 URLs in parallel and stops via context”.

Bad: “get better at algorithms”.
Good: “solve 10 two-pointer problems, 3 of them without hints”.

Check yourself: how will you prove on Sunday that you did it? If there’s nothing to prove it with, rewrite the goal.

## Practice beats consumption
Videos, articles and retyping code from a tutorial feel like learning, but they barely build skill. Rule: for every hour of consuming, spend at least an hour writing on your own, without hints.

## A good day is a day you got stuck
If you didn’t hit a single problem today and work it out yourself, it was probably too easy. Getting stuck is normal. That’s the moment you’re actually learning.

## How to write a report
Be specific: what you did, where you got stuck, what you understood. If you can’t explain a new thing in your own words, you’ve read it but don’t understand it yet.

Bad: “studied Go, was productive”.
Good: “built a worker pool (link). Hit a deadlock: forgot to close the channel, so range hung forever. Learned: the sender closes the channel, and then range over it ends”.
