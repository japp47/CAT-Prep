import type { RcSet } from "../types";
import { o, q, recall } from "./author";

/** Literature, art and history. */
export const HUMANITIES: RcSet[] = [
  {
    id: "lit-translation",
    title: "The translator's choices",
    genre: "literature",
    difficulty: "hard",
    paras: [
      "A common complaint about translations is that something is always lost. The Italian proverb puts it more harshly: traduttore, traditore, translator, traitor. Behind the complaint lies a picture of translation as the transfer of fixed content from one container to another, in which the best a translator can do is to spill as little as possible.",
      "Anyone who has tried to translate a poem knows that the picture is wrong. Words do not carry meanings in isolation; they carry sounds, rhythms, associations and histories, and these never line up neatly between languages. A word for 'home' may suggest a building in one language, a family in another and a native region in a third. A translator who keeps the literal sense may lose the tone; one who keeps the rhyme may have to change the image. There is no neutral solution, only a choice of which losses to accept.",
      "This is why the best translators are increasingly described as writers rather than conduits. The question they face is not 'what does this sentence mean?' but 'what is this sentence doing, and how can English do something like it?' Two excellent translations of the same novel can differ on almost every page and both be faithful, because faithfulness is not a property of individual words. It belongs to the relationship between a whole work and its readers.",
      "Seen this way, translation is also a form of criticism. To decide that a phrase is ironic rather than sincere, or that a character's formality marks distance rather than class, the translator must interpret the work, and readers of the translation inherit that interpretation, often without knowing it. This gives translators a quiet power that their usual invisibility on book covers conceals.",
      "It also suggests that the anxiety about loss is misplaced, or at least incomplete. Translations gain as well as lose: a work read in a new language acquires new echoes and can be understood in ways its first readers could not. Literature has always moved between languages, and much of what we call a national tradition was shaped by translations from elsewhere. The traitor of the proverb may be better described as a collaborator.",
    ],
    questions: [
      q("main", "Which of the following best states the main idea of the passage?", [1, 2, 4], [
        o("Poems cannot be translated.", "The passage says translation involves choosing which losses to accept, not that it is impossible.", "Extreme wording"),
        o("Translation is an act of interpretation and creative choice rather than a transfer of fixed meaning, and it adds as well as loses.", "Paragraphs 2 and 3 replace the container picture, paragraph 4 calls it criticism, and paragraph 5 says translations gain too."),
        o("Literal translation is more faithful than free translation.", "Faithfulness, the passage says, is not a property of individual words.", "Distorts the passage"),
        o("Translators deserve to have their names on book covers.", "Their invisibility is mentioned in passing, not argued about.", "Too narrow or too broad"),
      ]),
      q("structure", "The example of the word for 'home' is used to illustrate that:", [1], [
        o("some languages have no word for 'home'", "Each language has a word; they differ in what they suggest.", "Distorts the passage"),
        o("translators should always keep the literal sense", "The paragraph says keeping the literal sense may lose the tone.", "Distorts the passage"),
        o("family matters more in some cultures than in others", "The passage draws no cultural conclusion.", "Out of scope"),
        o("words in different languages carry associations that do not match exactly", "Building, family and region are different associations for corresponding words."),
      ]),
      q("inference", "Which of the following can be inferred from the fourth paragraph?", [3], [
        o("Readers of a translation may take the translator's interpretation for the author's intention.", "Readers 'inherit that interpretation, often without knowing it'."),
        o("Translators deliberately distort the works they translate.", "Interpretation is necessary, not deliberate distortion.", "Extreme wording"),
        o("Literary critics make better translators than novelists do.", "No such comparison is made.", "Out of scope"),
        o("A character's formality always signals social class.", "The example is that formality might mark distance rather than class.", "Extreme wording"),
      ]),
      q("application", "With which statement would the author most likely agree?", [2], [
        o("The best translation is the one that changes the fewest words.", "The author rejects word-level faithfulness.", "Distorts the passage"),
        o("A translation is always inferior to its original.", "Paragraph 5 says translations also gain.", "Extreme wording"),
        o("Two very different translations of a novel could both be faithful to it.", "Paragraph 3 says exactly this."),
        o("Translation has played little part in national literary traditions.", "Paragraph 5 says national traditions were shaped by translations.", "Distorts the passage"),
      ]),
    ],
    recall: [
      recall("What does the Italian proverb say?", ["Translator, traitor", "Every word is a home", "Meaning is lost at sea", "The writer is a reader"], 0),
      recall("What does the author suggest the proverb's traitor might better be called?", ["A critic", "A writer", "A collaborator", "A conduit"], 2),
    ],
  },
  {
    id: "lit-minds",
    title: "Inside other minds",
    genre: "literature",
    difficulty: "medium",
    paras: [
      "Novels let us do something that ordinary life does not: overhear another person's thoughts. In conversation we infer what others think from what they say and do; in fiction we are often told directly, or something close to it. The most distinctive technique for this, developed by writers such as Jane Austen and Gustave Flaubert, is known as free indirect style.",
      "In free indirect style, the narration slips into a character's way of thinking without announcing it. Instead of writing 'She thought that the party was a disaster', the narrator writes 'The party was a disaster. Why had she ever agreed to come?' The words remain in the third person and the past tense, yet the judgment and the question belong to the character. The reader is placed, for a moment, inside a mind while still standing a little outside it.",
      "That double position makes the technique a powerful tool for irony. Austen can let a character's vanity or self-deception speak in the narrator's voice, so that the reader both shares the character's view and sees around it. Much of the pleasure of her novels lies in noticing the gap between what a character believes and what the story reveals.",
      "Some psychologists have suggested that reading fiction of this kind exercises our capacity to understand other minds, the ability to recognise that other people have beliefs and desires different from our own. A few experiments found that reading literary fiction briefly improved performance on tests of this capacity; later attempts to repeat the results produced mixed findings. The idea remains plausible but unproved, and the effects, if real, may be small or slow to appear.",
      "Whatever the experiments show, the claim that novels teach empathy can be overstated. Readers can enjoy entering the minds of characters and remain unmoved by real people, and a novelist who makes a cruel character understandable does not make cruelty attractive. What fiction offers is perhaps less a moral training than a form of knowledge: a detailed sense of how a life looks from the inside, which no other art provides in quite the same way.",
    ],
    questions: [
      q("main", "Which of the following best captures the main idea of the passage?", [1, 3, 4], [
        o("Reading novels has been proven to make people more empathetic.", "Paragraph 4 calls the idea 'plausible but unproved'.", "Extreme wording"),
        o("Jane Austen invented free indirect style.", "It was developed by 'writers such as' Austen and Flaubert.", "Distorts the passage"),
        o("Free indirect style lets fiction show a mind from inside and outside at once, and the claim that this makes readers kinder is plausible but uncertain.", "Paragraphs 1 to 3 explain the technique; paragraphs 4 and 5 weigh the claims made for it."),
        o("Novels are morally dangerous because they make cruel characters understandable.", "Paragraph 5 says understanding cruelty does not make it attractive.", "Distorts the passage"),
      ]),
      q("application", "Which of the following sentences is written in free indirect style?", [1], [
        o("He thought that she might refuse him.", "The thought is announced with 'he thought that', which free indirect style avoids.", "Distorts the passage"),
        o("He looked at the letter again. Surely she could not mean to refuse him?", "Third person and past tense, but the doubt and the question belong to the character, unannounced."),
        o("'Will she refuse me?' he asked himself.", "This is direct speech, quoted and announced.", "Distorts the passage"),
        o("I looked at the letter and wondered whether she would refuse me.", "This is first-person narration, not third.", "Distorts the passage"),
      ]),
      q("inference", "The author's comment on the psychological experiments implies that:", [3], [
        o("the experiments were badly designed", "The author says nothing about their design.", "Out of scope"),
        o("reading fiction harms our understanding of other minds", "No experiment found harm.", "Distorts the passage"),
        o("psychologists have proved the idea false", "The findings are 'mixed', and the idea 'remains plausible'.", "Distorts the passage"),
        o("the evidence that reading fiction improves the understanding of other minds is not yet reliable", "Early results did not replicate consistently, so the idea is 'unproved'."),
      ]),
      q("structure", "In the final paragraph, the author's main purpose is to:", [4], [
        o("suggest that fiction's value may lie more in a kind of knowledge than in moral improvement", "It contrasts 'moral training' with 'a form of knowledge' and favours the second."),
        o("argue that novelists should avoid cruel characters", "The author defends making cruel characters understandable.", "Distorts the passage"),
        o("dismiss fiction as a source of understanding", "It ends by praising the knowledge fiction gives.", "Distorts the passage"),
        o("summarise the experiments described earlier", "The experiments are set aside: 'Whatever the experiments show'.", "Out of scope"),
      ]),
    ],
    recall: [
      recall("Which writers does the passage name as developing free indirect style?", ["Charles Dickens and Leo Tolstoy", "Jane Austen and Gustave Flaubert", "Virginia Woolf and James Joyce", "George Eliot and Henry James"], 1),
      recall("What did later attempts to repeat the experiments produce?", ["Mixed findings", "Stronger effects", "No data", "Identical results"], 0),
    ],
  },
  {
    id: "lit-tragedy",
    title: "Why we watch tragedy",
    genre: "literature",
    difficulty: "easy",
    paras: [
      "Tragedy poses an old puzzle. In ordinary life we avoid suffering and do not seek out the sight of it. Yet for two and a half thousand years audiences have paid to watch kings blind themselves, mothers lose their children and lovers die through misunderstanding, and they leave the theatre saying they enjoyed it. What is the pleasure in pain that is only pretended? The question was already old when Aristotle took it up, and it has never quite been settled.",
      "Aristotle's answer was catharsis, a word that has been translated as purging, cleansing and clarification. On the most familiar reading, tragedy arouses pity and fear and then releases them, leaving the audience calmer, as a medicine might expel a harmful substance. On another reading, the experience is less medical than intellectual: we come to understand pity and fear better by feeling them about events shaped into a meaningful whole. Scholars still argue over which reading Aristotle intended, since he says little about the term in the text that survives.",
      "Later thinkers offered other explanations. Some argued that we enjoy the skill of the representation rather than the events represented, as we can admire a painting of a corpse. Others pointed to a sense of relief or even superiority: we are safe while the hero falls. The philosopher David Hume suggested that the eloquence of a tragedy converts our distress into something pleasurable, so that the stronger the feeling, the stronger the delight, provided the art is good enough.",
      "None of these accounts is entirely satisfying, perhaps because the experience itself is mixed. Audiences do not simply enjoy tragedy; they are moved, disturbed and sometimes changed by it. The pleasure may lie partly in the sense that suffering, presented with care, becomes meaningful rather than random, and partly in the shared experience of an audience feeling the same thing at once.",
      "That may explain why tragedy survives in forms Aristotle never imagined, from novels to films to television dramas that end badly. We continue to seek out stories that do not console us with happy endings, not because we enjoy pain, but because we value seeing it given a shape.",
    ],
    questions: [
      q("main", "Which of the following best summarises the passage?", [3, 4], [
        o("Aristotle's theory of catharsis fully explains why people enjoy tragedy.", "Paragraph 4: 'None of these accounts is entirely satisfying'.", "Extreme wording"),
        o("People enjoy tragedy because they feel superior to its heroes.", "This is one of several explanations reported.", "Too narrow or too broad"),
        o("Tragedy has declined because modern audiences prefer happy endings.", "Paragraph 5 says tragedy survives in new forms.", "Distorts the passage"),
        o("Several explanations have been offered for the appeal of tragedy; the author suggests the experience is mixed and lies partly in giving suffering a meaning.", "Paragraphs 2 and 3 survey explanations; paragraphs 4 and 5 give the author's view."),
      ]),
      q("detail", "According to the passage, Hume believed that:", [2], [
        o("audiences enjoy tragedy because they feel safe", "That is the view of 'others', not Hume.", "Distorts the passage"),
        o("good art can turn the distress a tragedy causes into pleasure", "Hume: eloquence 'converts our distress into something pleasurable', provided the art is good enough."),
        o("tragedy purges harmful emotions like a medicine", "That is the familiar reading of Aristotle.", "Distorts the passage"),
        o("the weaker the feeling, the greater the delight", "Hume says the stronger the feeling, the stronger the delight.", "Distorts the passage"),
      ]),
      q("inference", "The two readings of catharsis in the second paragraph differ in that the second:", [1], [
        o("denies that tragedy arouses pity and fear", "Both readings involve feeling pity and fear.", "Distorts the passage"),
        o("was put forward by David Hume", "Hume's view comes in paragraph 3 and is different.", "Distorts the passage"),
        o("treats the experience as a way of understanding emotions rather than getting rid of them", "The second reading is 'less medical than intellectual': we understand pity and fear better."),
        o("applies only to modern films", "Films appear only in paragraph 5.", "Out of scope"),
      ]),
      q("structure", "The final paragraph mainly serves to:", [4], [
        o("criticise television dramas for ending badly", "They are cited as evidence for tragedy's survival, not criticised.", "Distorts the passage"),
        o("argue that people enjoy pain", "It says we seek such stories 'not because we enjoy pain'.", "Distorts the passage"),
        o("introduce Aristotle's theory", "Aristotle was introduced in paragraph 2.", "Distorts the passage"),
        o("use the survival of tragedy in new forms to support the author's account of its appeal", "'That may explain why' links the new forms back to the author's view in paragraph 4."),
      ]),
    ],
    recall: [
      recall("For how long, according to the passage, have audiences watched tragedies?", ["Five hundred years", "A thousand years", "Two and a half thousand years", "Since the invention of film"], 2),
      recall("What was Aristotle's answer to the puzzle of tragedy?", ["Catharsis", "Eloquence", "Superiority", "Relief"], 0),
    ],
  },
  {
    id: "hist-maps",
    title: "Maps that made empires",
    genre: "history",
    difficulty: "medium",
    paras: [
      "A map looks like a picture of the world, but it is better understood as an argument about it. Every map selects what to show and what to leave out, chooses a centre and a scale, and names places in someone's language. These choices are rarely neutral, and in the age of European empires they often did political work long before any soldier arrived.",
      "Consider the blank spaces on nineteenth-century European maps of Africa and Asia. To European readers they suggested empty land awaiting exploration and settlement, though the regions were full of people, states and long-established trade routes that local maps and travellers knew well. By representing what Europeans did not know as what did not exist, the maps made claims of ownership seem natural. Some of these maps were drawn by people who had never visited the places they showed, working from second-hand reports and older maps.",
      "Surveying was itself an instrument of rule. In India, the British spent decades measuring the subcontinent with chains, instruments and teams of local assistants, producing maps of unprecedented accuracy. The work had genuine scientific value, and it also served revenue collection, military planning and the drawing of administrative boundaries. Knowledge and control advanced together, and it is often impossible to say which was the aim and which the by-product.",
      "The most lasting legacy is the border. Lines drawn across maps by officials, sometimes with little regard for the people living on the ground, later became the frontiers of independent states. Some divided communities that had long lived together; others enclosed rivals within a single state. Many of the disputes of the twentieth century were fought over lines that began as administrative conveniences. Few of the officials who drew them expected their lines to last as long as they did.",
      "None of this means that maps are simply lies. A good map is an extraordinary tool, and colonial surveys contain information still used today. The point is to read maps as historical documents, asking who made them, for whom and to what end. Read that way, a map tells us as much about the people who drew it as about the land it shows.",
    ],
    questions: [
      q("main", "Which of the following best states the main idea of the passage?", [0, 4], [
        o("Colonial maps were inaccurate and are no longer used.", "The Indian survey was of 'unprecedented accuracy' and is still used.", "Distorts the passage"),
        o("Europeans explored regions of Africa and Asia that were empty.", "The passage says the regions were full of people and states.", "Distorts the passage"),
        o("The borders of Africa and Asia should be redrawn.", "No such proposal is made.", "Out of scope"),
        o("Maps make choices that can serve political ends, as colonial mapping shows, and should be read as historical documents.", "Paragraph 1 states the claim, paragraphs 2 to 4 illustrate it, and paragraph 5 draws the lesson."),
      ]),
      q("inference", "The author suggests that the blank spaces on nineteenth-century maps:", [1], [
        o("reflected the limits of European knowledge rather than an absence of people", "The maps represented 'what Europeans did not know as what did not exist'."),
        o("showed regions that had no states or trade routes", "The regions had both.", "Distorts the passage"),
        o("were left blank by local mapmakers", "Local maps knew these regions well.", "Distorts the passage"),
        o("were later filled in by independent states", "Nothing is said about who filled them in.", "Out of scope"),
      ]),
      q("except", "The passage gives each of the following as a use of the British survey of India EXCEPT:", [2], [
        o("collecting revenue", "Named in paragraph 3.", "True but not the answer"),
        o("promoting trade with other European empires", "Trade with other empires is never mentioned."),
        o("planning military operations", "Named in paragraph 3.", "True but not the answer"),
        o("drawing administrative boundaries", "Named in paragraph 3.", "True but not the answer"),
      ]),
      q("tone", "The author's attitude towards colonial maps is best described as:", [2, 4], [
        o("entirely dismissive", "The author calls a good map 'an extraordinary tool'.", "Extreme wording"),
        o("admiring of their neutrality", "The author says their choices were 'rarely neutral'.", "Distorts the passage"),
        o("critical of their political uses while recognising their value", "Paragraphs 1 to 4 show political uses; paragraph 5 grants scientific value and continued use."),
        o("indifferent", "The author takes a clear view.", "Distorts the passage"),
      ]),
    ],
    recall: [
      recall("Which of these did the British teams use to measure India?", ["Satellites", "Chains", "Aircraft", "Lasers"], 1),
      recall("What does the author call the most lasting legacy of colonial mapping?", ["The border", "The atlas", "The census", "The railway"], 0),
    ],
  },
  {
    id: "hist-print",
    title: "Was print a revolution?",
    genre: "history",
    difficulty: "hard",
    paras: [
      "It has become a commonplace that the printing press changed everything. After Johannes Gutenberg began printing with movable type in Mainz around 1450, the story goes, books became cheap, literacy spread, the Reformation became unstoppable and modern science became possible. The story is not wrong, but historians have spent decades complicating it, and the complications are instructive.",
      "One line of criticism concerns timing. For much of the first century of print, books remained expensive, many of them were religious or legal texts that had already circulated in manuscript, and literacy rose slowly and unevenly. Scribes did not disappear overnight; in some fields hand copying continued alongside print for generations. If print was a revolution, it was a slow one, and its effects depended on markets, schools and governments that changed at their own pace.",
      "Another concerns cause and effect. The historian Elizabeth Eisenstein argued that print transformed knowledge by fixing texts in identical copies, allowing scholars in different cities to compare the same page, correct errors and build on one another's work. Her critics accepted that this mattered but argued that she gave the technology credit for changes that depended on how people chose to use it. Early printed books were often full of errors and pirated editions, and the reliability she attributed to print had to be created by institutions such as learned societies and trusted publishers.",
      "A third looks beyond Europe. Printing with woodblocks had flourished in East Asia for centuries before Gutenberg, and movable type had been used in China and Korea. Yet it did not produce the same consequences there, partly because of the nature of the writing systems and partly because of the different ways in which states and scholars controlled the circulation of texts. The comparison suggests that technology alone does not explain outcomes.",
      "None of this diminishes the importance of print. What it changes is the kind of explanation we give. Rather than a machine that caused a series of transformations, print appears as one ingredient in a set of social changes, powerful in combination and modest in isolation. The lesson is plainly relevant to claims made about new technologies today.",
    ],
    questions: [
      q("main", "Which of the following best states the main idea of the passage?", [0, 4], [
        o("The printing press had little effect on European history.", "Paragraph 5: 'None of this diminishes the importance of print.'", "Distorts the passage"),
        o("Historians have qualified the view that print alone transformed society, showing its effects were slow and depended on social context.", "The three lines of criticism and the conclusion in paragraph 5 all support this."),
        o("Eisenstein's account of print has been entirely refuted.", "Her critics 'accepted that this mattered'.", "Extreme wording"),
        o("Printing was invented in East Asia rather than in Europe.", "East Asia had printing earlier, but the passage does not deny Gutenberg's role; it uses the comparison for a different point.", "Half right, half wrong"),
      ]),
      q("inference", "Eisenstein's critics would most likely agree that:", [2], [
        o("print had no effect on scholarship", "They accepted that fixed, identical copies mattered.", "Extreme wording"),
        o("early printed books were more reliable than manuscripts", "Early printed books were 'often full of errors and pirated editions'.", "Distorts the passage"),
        o("identical copies made comparison between scholars impossible", "Identical copies made comparison possible.", "Distorts the passage"),
        o("the reliability of printed texts depended partly on institutions people built around the technology", "Reliability 'had to be created by institutions such as learned societies and trusted publishers'."),
      ]),
      q("structure", "The discussion of East Asia in the fourth paragraph serves to:", [3], [
        o("suggest that the same technology can have different effects in different societies", "Printing existed there but 'did not produce the same consequences', so 'technology alone does not explain outcomes'."),
        o("argue that Gutenberg copied Korean inventions", "No claim of copying is made.", "Out of scope"),
        o("show that woodblock printing was better than movable type", "The two are not ranked.", "Out of scope"),
        o("explain why literacy rose slowly in Europe", "Slow literacy is discussed in paragraph 2, not explained by East Asia.", "Distorts the passage"),
      ]),
      q("strengthen", "Which of the following, if true, would most support the argument of the second paragraph?", [1], [
        o("Gutenberg's first printed Bible appeared around 1455.", "A date of publication says nothing about how fast print changed things.", "Out of scope"),
        o("Woodblock printing had spread across East Asia before 1450.", "Relevant to paragraph 4, not to the argument about timing.", "True but not the answer"),
        o("In some regions the number of professional scribes stayed steady for several decades after printing presses arrived.", "This supports the claim that change was slow and hand copying continued alongside print."),
        o("Printed books sold in larger numbers than manuscripts by the year 1600.", "Growth by 1600 is compatible with a slow first century and does not support the claim that change was slow.", "Out of scope"),
      ]),
    ],
    recall: [
      recall("In which city did Gutenberg begin printing with movable type?", ["Venice", "Paris", "Mainz", "London"], 2),
      recall("Which historian argued that print transformed knowledge by fixing texts in identical copies?", ["Elizabeth Eisenstein", "Benedict Anderson", "Lucien Febvre", "Fernand Braudel"], 0),
    ],
  },
];
