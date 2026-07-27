export interface DialogueLine {
  speaker: string;
  text: string;
}

export const dialogues: Record<string, DialogueLine[]> = {
  snail_intro: [
    {
      speaker: 'Snail',
      text: "Hello, little guppy. Have you noticed the water has opinions today?",
    },
    {
      speaker: 'Snail',
      text: "It swirls one way, then the other. Very dramatic. I find it exhausting.",
    },
    {
      speaker: 'George',
      text: "Everything's exhausting. My fins ache, I don't like the current, and I'm not sold on the temperature either.",
    },
    {
      speaker: 'Snail',
      text: "Charming. Follow the bright bubbles — they remember the way home.",
    },
  ],
  frog_barrel: [
    {
      speaker: 'Frog',
      text: "Evening! You've landed in my barrel. It's dark, it's round, and it's mine.",
    },
    {
      speaker: 'George',
      text: "It's freezing. Why is it so cold in here?",
    },
    {
      speaker: 'Frog',
      text: "Rain off the roof, straight down the pipe. It never gets a chance to warm up.",
    },
    {
      speaker: 'Frog',
      text: "Keep well clear of the drain, mind. It pulls, and it isn't sorry about it.",
    },
    {
      speaker: 'George',
      text: "A cold room with a hole in it. Wonderful.",
    },
  ],
  sponge_wisdom: [
    {
      speaker: 'Sponge',
      text: "Shh. I'm soaking. It's a lifestyle.",
    },
    {
      speaker: 'George',
      text: "Why is it so warm in here? Warm water makes me extra cranky.",
    },
    {
      speaker: 'Sponge',
      text: "Warm water holds less air for you to breathe. That's your crankiness, right there.",
    },
    {
      speaker: 'Sponge',
      text: "So swim slowly, orange one. A calm fish needs less.",
    },
  ],
  snail_homecoming: [
    {
      speaker: 'Snail',
      text: "Well. Look who found his way back.",
    },
    {
      speaker: 'George',
      text: "Don't make a fuss. I simply ran out of anywhere else to be.",
    },
    {
      speaker: 'Snail',
      text: "Naturally. Home is only the last place you complained in.",
    },
    {
      speaker: 'George',
      text: "...The plants are still too green. But they're my plants.",
    },
  ],
  victory_epilogue: [
    {
      speaker: 'George',
      text: "Home. Finally. The plants are far too green, but I'll allow it.",
    },
    {
      speaker: 'Snail',
      text: "You made it! And you only complained most of the way. Progress!",
    },
    {
      speaker: 'George',
      text: "I'm not happy. I'm just... a little less cranky. Don't tell anyone.",
    },
    {
      speaker: 'Snail',
      text: "Your secret's safe, George. Go on — the good water's waiting.",
    },
  ],
};
