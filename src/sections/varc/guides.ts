import type { VaKind } from "../../practice/va/build";

/**
 * One Learn guide per VARC question type. Source and review notes: docs/content/varc-type-guides.md.
 * Worked examples are original. Links were checked on 17 Oct 2026.
 */

export interface GuideLink { k: "Guide" | "Video" | "Practice"; n: string; u: string; note?: string }

export interface WorkedExample {
  /** What to do, shown above the material */
  ask: string;
  /** The sentence to place, for sentence insertion */
  insert?: string;
  passage?: string;
  /** Numbered sentences, for para jumbles and odd sentence out */
  items?: string[];
  question?: string;
  /** Lettered options A to D */
  options?: string[];
  answer: string;
  why: string[];
}

/** A plain trap, or [label, explanation] */
export type Trap = string | [string, string];

export interface TypeGuide {
  id: string;
  h: string;
  /** Short label next to the title: format and marking */
  tag: string;
  what: string;
  /** Sub-types, for critical reasoning */
  kinds?: [string, string][];
  method: string[];
  traps: Trap[];
  example: WorkedExample;
  links: GuideLink[];
  /** In-app drill for this type */
  drill?: VaKind | "rc";
}

export const TYPE_GUIDES: TypeGuide[] = [
  {
    id: "summary-writing", h: "After every article", tag: "Habit",
    what: "Not a CAT question, but the habit behind para summary and RC main-idea questions. After each article you read, write a summary of 25 words or fewer, plus one word for the author's tone.",
    method: [
      "Read the whole piece once without stopping.",
      "Ask what the author wants you to believe, and write that as one sentence in your own words.",
      "Add the most important qualifier: words like often, partly, in rich countries, for now.",
      "Leave out examples, figures and names unless the argument depends on them.",
      "Cut until it fits in 25 words. If you need more, you have not found the main point yet.",
      "Write one word for the tone: for example critical, cautious, admiring or ironic.",
    ],
    traps: [
      "Summarising the first paragraph instead of where the author ends up.",
      "Keeping a vivid example and losing the claim it supports.",
      "Copying phrases from the text, which lets you skip the thinking.",
      "Adding your own opinion.",
      "Dropping the qualifier, so that “often” quietly becomes “always”.",
    ],
    example: {
      ask: "Summarise this paragraph in 25 words or fewer, and give the tone in one word.",
      passage: "Libraries were once judged by the size of their collections. A great library was one that owned more books than its rivals, and its prestige grew with every shelf. The internet has weakened that measure. When millions of texts can be read online, owning a copy matters less than helping people find, judge and use what they need. Many libraries have responded by turning shelves into study spaces, running classes on research skills and lending laptops as readily as novels. Their value, increasingly, lies not in what they hold but in what they help their visitors do.",
      answer: "“With texts now online, a library's worth lies less in owning books than in helping people find, judge and use information.” (21 words) Tone: approving.",
      why: [
        "It gives the cause (texts online), the shift (owning to helping) and the qualifier (less, not no longer), and adds nothing new.",
        "Weak: “Libraries now lend laptops and run classes.” This keeps only the examples.",
        "Weak: “The internet has made libraries useless.” The passage says the measure changed, not that libraries lost their value.",
      ],
    },
    links: [
      { k: "Guide", n: "Summarizing, Integrated Reading and Writing (LibreTexts, CC BY 4.0)", u: "https://human.libretexts.org/Courses/Evergreen_Valley_College/Integrated_Reading_and_Writing/01%3A_Integrated__Reading_and_Writing_%28IRW%29/1.02%3A_Critical_Reading_Strategies/1.2.05%3A_Summarizing", note: "Preview, annotate, then summarise in your own words at a third to a quarter of the length, without opinion." },
      { k: "Video", n: "What is a main idea? (Khan Academy, 5 min)", u: "https://www.youtube.com/watch?v=4swFGRhQoMI", note: "A short basic introduction. Skip it if you already summarise easily." },
      { k: "Practice", n: "Bharath's Reading List (2IIM)", u: "https://online.2iim.com/cat-exam/blogs/category/cat-reading-list/", note: "Articles by genre to summarise. Also in the Read tab." },
    ],
  },
  {
    id: "rc", h: "Reading comprehension", tag: "MCQ, −1 if wrong", drill: "rc",
    what: "16 of the 24 VARC questions: four passages of about 400 to 550 words, four MCQs each. Questions ask for the main idea, the author's purpose and tone, inferences, details, “all EXCEPT”, strengthen and weaken, assumptions, application and meaning in context.",
    method: [
      "Read actively, once. After paragraph 1, name the topic. After each later paragraph, note its job: claim, example, objection, answer or conclusion.",
      "At the end, say the main idea and the author's tone in one line each before you look at a question.",
      "For each question, go back to the paragraph that settles it. Don't reread the whole passage.",
      "Remove three options rather than hunting for one. Say why each wrong option is wrong.",
      "Keep to about 7 minutes per passage. If one is eating your time, finish the easy questions and move on. Attempt all four passages only once your accuracy is above 80%.",
    ],
    traps: [
      ["Extreme wording", "always, never, only, proves."],
      ["Out of scope", "true in the world, but not in the passage."],
      ["Half right, half wrong", "the first half matches; the second half slips."],
      ["True but not the answer", "accurate, but it answers a different question."],
      ["Distorts the passage", "reverses a cause, a stance or a comparison."],
      ["Too narrow or too broad", "one example, or a claim bigger than the passage."],
    ],
    example: {
      ask: "Read the passage and answer the question.",
      passage: "For decades, economists assumed that people who won large lottery prizes would stop working; the money, after all, removed the need. Studies of large winners in several European countries found a more modest effect: most kept their jobs, though many cut their hours a little. Researchers suggest that work offers more than income: routine, company and a sense of being useful, none of which a prize can buy.",
      question: "Which of the following can best be inferred from the passage?",
      options: [
        "Most lottery winners keep working partly for reasons other than money.",
        "Lottery winners tend to work harder after winning than before.",
        "Economists now accept that money has no effect on whether people work.",
        "People close to retirement are more likely to buy lottery tickets.",
      ],
      answer: "A",
      why: [
        "A: most winners kept their jobs, and work is said to give things money cannot buy.",
        "B distorts the passage: many cut their hours.",
        "C is extreme wording: the effect was modest, not zero.",
        "D is out of scope: nothing is said about who buys tickets.",
      ],
    },
    links: [
      { k: "Guide", n: "The Five Pauses Technique (IMS Indore)", u: "https://imsindore.com/blog/five-pauses-technique-rc/", note: "Pause after each paragraph to name its job, then state the main idea and tone at the end." },
      { k: "Video", n: "Reading Comprehension: The Five Pauses Technique, Tony Xavier (Bell The CAT, 65 min)", u: "https://www.youtube.com/watch?v=SGh6aJOFsGM" },
      { k: "Practice", n: "Cracku: 858+ CAT RC questions", u: "https://cracku.in/cat-reading-comprehension-questions", note: "Past-paper passages by year, with video solutions." },
    ],
  },
  {
    id: "pj", h: "Para jumbles", tag: "TITA, no negative", drill: "pj",
    what: "Four (sometimes five) sentences from one paragraph, in a jumbled order. You type the right order, for example 2413. There is no negative marking, so always answer.",
    method: [
      "Find the opener: a sentence that introduces the subject and doesn't point back with this, he, such, however or also.",
      "Lock the mandatory pairs, the sentences that must sit together: a pronoun and its noun; a connector (however, therefore, for example) and the idea before it; a term and its definition; a claim and its example; an earlier and a later time.",
      "Build from the pairs, not from the first sentence alone.",
      "Practice with the options hidden, because CAT gives none.",
      "Read your final order through as one paragraph. If any join is rough, test the next best order.",
    ],
    traps: [
      "Choosing an opener that starts with a pronoun or connector.",
      "Trusting one strong link and forcing the rest around it.",
      "Ignoring time order: once, later, today.",
      "Putting an example before the claim it illustrates.",
      "Never reading the finished paragraph through.",
    ],
    example: {
      ask: "Arrange the sentences into a coherent paragraph. Type the order.",
      items: [
        "Aerial photography in the twentieth century, and satellites after it, changed this almost overnight.",
        "For most of history, maps were made by surveyors who walked, rode or sailed the land they drew.",
        "Today the problem is no longer a lack of data but deciding which of the countless details a map should leave out.",
        "Their work was slow and dangerous, and large regions remained blank for centuries.",
      ],
      answer: "2413",
      why: [
        "2 opens: it is general, and nothing points back.",
        "4 must follow 2, because “Their work” is the surveyors' work.",
        "1 follows 4, because “changed this” refers to the slow work and blank regions.",
        "3 closes: “Today… no longer a lack of data” is the result of the change in 1.",
      ],
    },
    links: [
      { k: "Guide", n: "How to Solve Parajumbles for CAT + 24 Solved PYQs (Preparoo)", u: "https://mba.preparoo.app/cat/how-to-solve-parajumbles", note: "By a CAT 99.96 percentiler with 100 in VARC. Rule out openers, find the strongest pair, grow the chain, read it through." },
      { k: "Video", n: "Para Jumbles for CAT: 60 Second Rule, KD Sir (Rodha)", u: "https://www.youtube.com/watch?v=aVpkke5xyFY", note: "Made for CAT 2027." },
      { k: "Practice", n: "Cracku: 160+ CAT para jumbles", u: "https://cracku.in/cat-para-jumbles-questions", note: "Past-paper questions with video solutions and a free PDF." },
    ],
  },
  {
    id: "ps", h: "Para summary", tag: "MCQ, −1 if wrong", drill: "ps",
    what: "A short paragraph and four summaries. Pick the one that best captures it. +3 for a right answer, −1 for a wrong one.",
    method: [
      "Before reading the options, put the paragraph in one line of your own.",
      "Find where the author ends up. Paragraphs often set up a view and then turn with but, yet or however.",
      "Separate the main claim from its support. Examples, figures and named cases are support.",
      "Check each option against your line: does it keep the main claim, its qualifier, and the direction of any cause?",
      "Between two close options, pick the one that covers the whole paragraph and adds nothing.",
    ],
    traps: [
      ["Too narrow", "one example or one step of the argument."],
      ["Too broad", "a general truth bigger than the paragraph."],
      ["New idea", "a claim, cause or recommendation the paragraph never makes."],
      ["Extreme wording", "all, always, only, never."],
      ["Stance or tone shift", "a cautious author made confident, or a critic made neutral."],
      ["Reversed cause", "effect and cause swapped."],
    ],
    example: {
      ask: "Choose the option that best summarises the paragraph.",
      passage: "Cities often respond to traffic jams by building more roads. The relief rarely lasts. New lanes make driving quicker for a while, so people who used to take the train, travel at other times or stay home begin to drive. Within a few years the roads are as crowded as before, only with more cars on them. Transport researchers call this induced demand, and it suggests that the cure for congestion lies less in adding capacity than in managing how roads are used.",
      options: [
        "Building new roads always makes traffic worse than before, so every city should stop building them and spend the money on trains instead.",
        "New roads draw in extra drivers until congestion returns, so managing road use does more than adding capacity.",
        "People switch from trains to cars when new lanes make driving quicker.",
        "Transport researchers have studied traffic in cities around the world for many decades.",
      ],
      answer: "B",
      why: [
        "B covers the mechanism (extra drivers), the result (congestion returns) and the conclusion (manage use rather than add capacity).",
        "A is extreme and adds a new idea, spending on trains. It is also the longest option: length is not a clue.",
        "C is too narrow: it is one step of the mechanism.",
        "D is out of scope.",
      ],
    },
    links: [
      { k: "Guide", n: "CAT VARC Para Summary (Physics Wallah)", u: "https://www.pw.live/mba/exams/cat-varc-para-summary", note: "Central idea first, then checks for distortion, unsupported additions, missing parts, tone shifts and overgeneralisation." },
      { k: "Video", n: "Verbal Ability: Summary Questions, Tony Xavier (Bell The CAT, 37 min)", u: "https://www.youtube.com/watch?v=63v4WvL5evA" },
      { k: "Practice", n: "Cracku: 96+ CAT para summary questions", u: "https://cracku.in/cat-para-summary-questions", note: "Past papers from 1991 to 2025, with written and video solutions." },
    ],
  },
  {
    id: "oso", h: "Odd sentence out", tag: "TITA, no negative", drill: "oso",
    what: "Five sentences: four form a coherent paragraph and one does not belong. Type its number. There is no negative marking.",
    method: [
      "Read all five and name the shared topic.",
      "Build the coherent paragraph first: find the opener and the pairs, as in a para jumble.",
      "The odd sentence is usually on the topic but off the focus: the same keywords with a different time, scope or angle.",
      "Take out your candidate and read the other four in order. They should flow without a gap.",
      "If two sentences seem odd, keep the one the other four need for their flow.",
    ],
    traps: [
      "Picking a sentence because its tone or style differs. CAT tests focus, not style.",
      "Picking a sentence that is merely an example. Examples usually belong.",
      "Missing the sentence that shares every keyword but changes the time or subject.",
      "Not checking that the remaining four actually form a sequence.",
    ],
    example: {
      ask: "Which sentence does not belong? Type its number.",
      items: [
        "In the 1840s, the doctor Ignaz Semmelweis noticed that women in one maternity ward of a Vienna hospital died of fever far more often than those in another.",
        "The deadlier ward was staffed by doctors who came straight from dissecting corpses, while the other was run by midwives.",
        "Hospitals today use alcohol-based gels, which kill most germs faster than soap and water.",
        "When Semmelweis made the doctors wash their hands in a chlorine solution, deaths in their ward fell sharply.",
        "His colleagues, however, rejected his conclusion, partly because it implied that they themselves had been carrying death to their patients.",
      ],
      answer: "3",
      why: [
        "1, 2, 4 and 5 tell one story in order: what Semmelweis noticed, why, what he did, and how it was received.",
        "Sentence 3 is about hand hygiene, but it moves to modern hospitals and products: a different time and focus.",
      ],
    },
    links: [
      { k: "Guide", n: "How to Solve Odd One Out for CAT + 20 Solved PYQs (Preparoo)", u: "https://mba.preparoo.app/cat/how-to-solve-odd-one-out", note: "Build the strongest four first, then test the leftover on topic, focus, scope, logic, time, example, tone and link." },
      { k: "Video", n: "Verbal Ability: Incorrect Sentence in Context, Tony Xavier (Bell The CAT, 36 min)", u: "https://www.youtube.com/watch?v=LaqVxc0faQ0" },
      { k: "Practice", n: "Cracku: 48+ CAT odd one out questions", u: "https://cracku.in/cat-odd-one-out-questions", note: "Past papers from 2017 to 2025, with solutions." },
    ],
  },
  {
    id: "si", h: "Sentence insertion", tag: "MCQ, −1 if wrong", drill: "si",
    what: "A paragraph with four numbered gaps, and one sentence taken out of it. Choose the gap it came from. It is an MCQ, so a wrong answer costs a mark.",
    method: [
      "Read the sentence first. Note what it points back to (this, its, however, such) and what it sets up.",
      "Read the paragraph and note each sentence's job.",
      "At each gap, read the sentences just before and just after. The right gap links to both.",
      "Rule out any gap where the sentences before and after already join smoothly; inserting there would break a link.",
      "Put the sentence in your chosen gap and read the whole paragraph once.",
    ],
    traps: [
      "Choosing a gap because it shares a keyword with the sentence.",
      "Checking only the sentence before the gap and ignoring the one after.",
      "Placing a sentence whose pronoun has nothing to refer to yet.",
      "Placing a summary sentence before the details it sums up.",
    ],
    example: {
      ask: "Where does this sentence best fit?",
      insert: "Its most remarkable feature, however, is how fast it grows.",
      passage: "(1) Bamboo is technically a grass, not a tree. (2) Some species can grow almost a metre in a single day, and a stem reaches its full height within a few months. (3) That speed has made bamboo attractive to builders looking for materials that can be replaced quickly. (4) In parts of Asia and Latin America it has been used for scaffolding and houses for centuries, and engineers are now testing treated bamboo for larger buildings.",
      answer: "Gap (2)",
      why: [
        "“Its” needs bamboo named first, which rules out (1).",
        "“However” turns from how bamboo is classified to what is special about it.",
        "The growth figures that follow are the details the sentence introduces.",
        "At (3) the speed has already been described, so the sentence would repeat it. At (4) the paragraph has moved on to building.",
      ],
    },
    links: [
      { k: "Guide", n: "CAT VARC Para Completion (Physics Wallah)", u: "https://www.pw.live/mba/exams/cat-varc-para-completion", note: "Written for the older fill-in version, but its checks apply: the job of the missing sentence, pronoun and connector clues, rereading the paragraph." },
      { k: "Video", n: "Missing Sentence in Paragraph, Tony Xavier (Bell The CAT, 27 min)", u: "https://www.youtube.com/watch?v=vUJKh8EIe1Q" },
      { k: "Practice", n: "Cracku: 27 CAT sentence placement questions", u: "https://cracku.in/cat-para-completion-questions", note: "CAT 2022 to 2025, all in the current gap format, with written explanations." },
    ],
  },
  {
    id: "cr", h: "Critical reasoning", tag: "XAT, not CAT",
    what: "A short argument followed by one question. CAT no longer asks it as a separate type, but XAT does, and it trains the judgement that RC options need.",
    kinds: [
      ["Assumption", "what the argument takes for granted."],
      ["Strengthen or weaken", "what makes the conclusion more or less likely."],
      ["Inference", "what must be true from the statements."],
      ["Flaw", "what is wrong with the reasoning."],
      ["Paradox", "what explains an apparent contradiction."],
    ],
    method: [
      "Find the conclusion: often after so, therefore or thus, or it is the claim the rest supports.",
      "Find the evidence, then the gap between the evidence and the conclusion. Most questions are about that gap.",
      "Read the question stem and name its type before reading the options.",
      "For an assumption, use the negation test: if negating the option destroys the argument, it is the assumption.",
      "For strengthen or weaken, aim at the gap, not at the evidence. For inference, accept nothing that goes beyond the statements.",
    ],
    traps: [
      ["Out of scope", "about something the argument doesn't rely on."],
      ["Wrong direction", "strengthens when the question asks you to weaken, or the reverse."],
      ["Too strong", "“must” or “all”, when the argument needs less."],
      ["Attacks the evidence", "disputes a fact the question asks you to accept."],
      ["Restates the conclusion", "repeats it instead of supporting it."],
    ],
    example: {
      ask: "Read the argument and answer the question.",
      passage: "A city installed brighter street lights in its central district last year. Since then, reported thefts in the district have fallen by a fifth. The council concludes that brighter lighting reduces theft and plans to install it across the city.",
      question: "Which of the following, if true, most weakens the council's conclusion?",
      options: [
        "Residents of the central district say they feel safer walking at night.",
        "Over the same period, the city doubled the number of police patrols in the central district.",
        "The brighter street lights use more electricity than the old ones.",
        "Most thefts in the city take place after dark.",
      ],
      answer: "B",
      why: [
        "The conclusion is that the lights caused the fall. The evidence is that theft fell after the lights went in. The gap: nothing else changed.",
        "B shows something else did change, which offers another cause.",
        "A and D, if anything, support the argument.",
        "C is out of scope: it is about cost, not whether the lights work.",
      ],
    },
    links: [
      { k: "Guide", n: "GMAT Critical Reasoning: question types and samples (e-GMAT)", u: "https://e-gmat.com/blogs/gmat-critical-reasoning-practice-questions/", note: "Every common question type explained, with 10 sample questions; solutions sit behind separate links." },
      { k: "Video", n: "Assumption, Strengthen and Weaken: GMAT Critical Reasoning #2 (GMAT Ninja)", u: "https://www.youtube.com/watch?v=S-nH6HAkgkE" },
      { k: "Practice", n: "Cracku: 38+ CAT critical reasoning questions", u: "https://cracku.in/cat-critical-reasoning-questions", note: "Past-paper questions with video solutions." },
    ],
  },
];
