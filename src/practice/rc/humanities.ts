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
  {
    id: "hist-cholera",
    title: "The map that found a pump",
    genre: "history",
    difficulty: "medium",
    paras: [
      "In the late summer of 1854, cholera killed more than five hundred people in ten days in the Soho district of London. The disease was terrifying: it could kill a healthy adult within a day, through violent diarrhoea and dehydration. The dominant medical theory of the time held that the disease spread through miasma, a poisonous vapour rising from rotting matter, which is why the city's response focused on clearing filth and improving ventilation. The physician John Snow believed instead that cholera was carried in water contaminated by the waste of the sick.",
      "Snow went door to door, recording where the dead had lived, and found that the deaths clustered around a public water pump on Broad Street. Marked on a street map, they gathered most thickly around the pump. The exceptions strengthened his case. Workers at a nearby brewery, who drank beer and water from the brewery's own well, were largely spared, while a woman who lived miles away, but had water from Broad Street brought to her because she liked its taste, died of the disease. Snow persuaded the local authorities to remove the pump's handle.",
      "The story is often told as a tale of instant triumph, but the facts are more complicated. The outbreak was already declining when the handle came off, as many residents had fled, and Snow himself acknowledged this. Even the source of the contamination, a cesspool beside the well into which a sick baby's soiled nappies had been emptied, was traced only later, by a local clergyman. A government inquiry the following year considered his water theory and rejected it, preferring to explain the outbreak through conditions in the air. Only in the 1860s, after further outbreaks and the work of others, did the idea that cholera was waterborne gain general acceptance.",
      "Snow's achievement lay less in stopping a single outbreak than in his method. By comparing who fell ill with who did not, and by looking hardest at the cases that did not fit, he turned a map of deaths into an argument about causes. That way of reasoning, rather than the image of a pump without a handle, is his real legacy to public health.",
    ],
    questions: [
      q("main", "Which of the following best expresses the main idea of the passage?", [2, 3], [
        o("Snow single-handedly ended the 1854 outbreak by removing a pump handle.", "Paragraph 3 says the outbreak was already declining.", "Distorts the passage"),
        o("Snow's lasting contribution was a way of reasoning from comparisons, even though his theory was not accepted at once.", "Paragraph 4 names the method as his legacy; paragraph 3 records the slow acceptance."),
        o("The miasma theory was correct about cholera after all.", "The passage treats the water theory as the one later accepted.", "Distorts the passage"),
        o("Cholera in Victorian London was spread mainly by breweries.", "The brewery is an exception that supported Snow's theory.", "Out of scope"),
      ]),
      q("inference", "The brewery workers and the woman who lived far away matter to Snow's argument because:", [1], [
        o("they prove that beer protects against cholera", "The workers were spared because they did not drink the pump's water.", "Distorts the passage"),
        o("they were the only people in the area who did not drink from the pump", "Nothing says they were the only ones.", "Extreme wording"),
        o("they were the first victims of the outbreak", "Only the woman died, and nothing says she was among the first.", "Out of scope"),
        o("their cases fitted the water theory but were hard to explain by bad air in the neighbourhood", "Workers breathing Soho's air were spared; a woman far from it, drinking its water, died."),
      ]),
      q("inference", "It can be inferred that the government inquiry of 1855:", [2], [
        o("was influenced by the belief, common at the time, that disease spread through the air", "It preferred 'conditions in the air', in line with the miasma theory described in paragraph 1."),
        o("accepted Snow's theory but kept the finding quiet", "It 'rejected' his theory.", "Distorts the passage"),
        o("found that the pump handle had never been removed", "Nothing like this is reported.", "Out of scope"),
        o("blamed the brewery for the outbreak", "The brewery is never connected with the inquiry.", "Out of scope"),
      ]),
      q("tone", "The author's attitude to the popular story of the pump handle is one of:", [2, 3], [
        o("unqualified admiration", "The author calls the story more complicated than it is told.", "Extreme wording"),
        o("complete rejection: Snow contributed nothing to public health", "The author credits Snow with a lasting legacy.", "Distorts the passage"),
        o("gentle correction: the story simplifies events and misses what mattered most", "Paragraph 3 corrects the 'instant triumph'; paragraph 4 moves the credit to his method."),
        o("amusement at the foolishness of Victorian officials", "There is no mockery in the passage.", "Out of scope"),
      ]),
    ],
    recall: [
      recall("On which street was the pump at the centre of the outbreak?", ["Oxford Street", "Broad Street", "Baker Street", "Fleet Street"], 1),
      recall("Which group was largely spared?", ["Brewery workers", "Doctors", "Children", "Shopkeepers"], 0),
    ],
  },
  {
    id: "hist-silk",
    title: "The road that was not a road",
    genre: "history",
    difficulty: "hard",
    paras: [
      "The phrase 'Silk Road' was coined only in 1877, by the German geographer Ferdinand von Richthofen, whose work in China included surveying routes for a proposed railway. It has since become one of the most evocative names in history, conjuring caravans carrying bolts of silk across deserts from Chang'an to Rome. The name caught on slowly, and became popular only in the twentieth century, through travel writing, exhibitions and, later, television. The image is not wrong so much as misleading, and the ways in which it misleads are instructive.",
      "There was no single road, and almost no one travelled its full length. Goods moved in relays, changing hands many times between local merchants who knew only their own stretch of a network of routes running through oases, mountain passes and, increasingly, sea lanes. A Roman lady wearing Chinese silk had no idea where it came from, and the Chinese who made it had only hazy notions of Rome. Much of the traffic, moreover, was local and regional: horses, grain, paper and metalwork rather than luxuries bound for distant empires.",
      "Silk itself was only one commodity among many, and in some periods not the most important. Its production, in any case, did not stay a Chinese secret: silkworms reached the Byzantine empire in the sixth century. What travelled furthest and lasted longest were often things that weighed nothing: religions such as Buddhism, which moved from India into Central Asia and China; techniques such as papermaking, which reached the Islamic world and later Europe; and, less happily, diseases, which used the same routes as merchants and pilgrims.",
      "Why, then, does the romantic image persist? Partly because it suits modern purposes. Governments promoting new infrastructure and trade links across Asia invoke the Silk Road as a precedent, presenting their projects as the revival of an ancient, harmonious exchange. Historians are wary of such borrowings, which tend to leave out the soldiers, slaves and tax collectors who also travelled the routes. The networks they study were real and transformative, but they were also patchy, contested and often violent, and a name invented by a railway surveyor tells us at least as much about the nineteenth century's ambitions as about the past it claims to describe.",
    ],
    questions: [
      q("main", "The central claim of the passage is that:", [0, 1, 2, 3], [
        o("the Silk Road was a single route that linked Chang'an directly to Rome", "Paragraph 2 says there was no single road.", "Distorts the passage"),
        o("silk was the only commodity that mattered in trade between Asia and Europe", "Paragraph 3 says silk was one commodity among many.", "Extreme wording"),
        o("modern infrastructure projects in Asia are bound to fail", "The passage questions their use of history, not their prospects.", "Out of scope"),
        o("the popular image misrepresents a patchy network whose most lasting exchanges were often of ideas and techniques", "Each paragraph corrects part of the romantic image."),
      ]),
      q("except", "The passage mentions all of the following as having travelled along these routes EXCEPT:", [2], [
        o("Buddhism", "Named in paragraph 3.", "True but not the answer"),
        o("papermaking", "Named in paragraph 3.", "True but not the answer"),
        o("railway technology", "The railway appears only as the reason Richthofen was surveying routes."),
        o("diseases", "Named in paragraph 3.", "True but not the answer"),
      ]),
      q("inference", "The example of the Roman lady wearing Chinese silk is used to show that:", [1], [
        o("Romans valued silk more highly than the Chinese did", "Nothing compares how the two valued silk.", "Out of scope"),
        o("trade passed through so many hands that the two ends knew little of each other", "It illustrates goods moving 'in relays' between merchants who knew only their own stretch."),
        o("Roman women controlled the silk trade", "She is a buyer who knew nothing of the trade.", "Distorts the passage"),
        o("silk reached Rome by sea rather than over land", "The example says nothing about the route.", "Out of scope"),
      ]),
      q("inference", "The last sentence suggests that the name 'Silk Road':", [3], [
        o("reflects nineteenth-century ambitions as much as the past it describes", "A railway surveyor's name 'tells us at least as much about the nineteenth century's ambitions'."),
        o("was invented by historians to describe violent conflicts", "It was coined by a geographer, and historians are wary of it.", "Distorts the passage"),
        o("should be replaced in textbooks by a more accurate term", "No new term is proposed.", "Out of scope"),
        o("accurately describes a harmonious exchange in the past", "The author calls the networks 'contested and often violent'.", "Distorts the passage"),
      ]),
    ],
    recall: [
      recall("Who coined the phrase 'Silk Road'?", ["Marco Polo", "Ferdinand von Richthofen", "A Roman historian", "A Chinese emperor"], 1),
      recall("Which religion does the passage say travelled from India into Central Asia and China?", ["Islam", "Christianity", "Buddhism", "Zoroastrianism"], 2),
    ],
  },
  {
    id: "lit-oral",
    title: "Singers who never sang the same song twice",
    genre: "literature",
    difficulty: "medium",
    paras: [
      "For centuries readers wondered how a single poet could have composed the Iliad and the Odyssey, poems of more than twenty-seven thousand lines between them, without writing. Some scholars doubted that one person had composed them at all, and argued that they were stitched together from shorter songs by later editors. The question was transformed in the 1930s by Milman Parry, a young American scholar, and his assistant Albert Lord, who travelled to Yugoslavia to record singers of heroic songs in coffee houses and villages.",
      "Parry had noticed that Homer's verse is built from repeated phrases, such as 'rosy-fingered dawn' or 'swift-footed Achilles', each of which fits a particular slot in the rhythm of the line. In the Balkan singers he found the same technique alive. A skilled singer did not memorise a fixed text. He knew a large stock of formulas and familiar scenes, such as the arming of a hero or the gathering of an assembly, and used them to compose the song afresh as he performed it, at a pace no reciter of memorised lines could match.",
      "One consequence surprised the scholars. Singers insisted that they performed a song 'the same' each time, word for word, yet recordings of the same singer on different occasions showed long passages that differed considerably. One singer, asked to perform a song he had heard only once, produced a version far longer than the original, and still described it as the same song. For the singers, sameness meant the same story, the same heroes and the same events, not the identical sequence of words that a culture of print has taught us to expect.",
      "Parry died in an accident in 1935, and Lord carried the work on. His book on these findings, The Singer of Tales, changed the study of early literature. It suggested that the Homeric poems were the product of a long tradition of oral composition, perhaps written down at a particular performance, rather than the invention of a solitary author working from a draft. Many questions remain open, including how and when the poems were fixed in writing. But the idea of a single correct text, which modern editors take for granted, may be a poor guide to how such poetry was made and heard.",
    ],
    questions: [
      q("main", "Which of the following best captures the main point of the passage?", [1, 3], [
        o("Homer never existed, and the Iliad was really composed by Balkan singers.", "The Balkan singers offered a living parallel, not the source of the Iliad.", "Distorts the passage"),
        o("Milman Parry was the greatest classical scholar of the twentieth century.", "The passage does not rank scholars.", "Out of scope"),
        o("Studies of Balkan singers suggested that Homer's poems came from a tradition of composing in performance, not from fixed memorised texts.", "Covers the method, the evidence and the conclusion in paragraph 4."),
        o("Oral poets memorise their songs word for word.", "Paragraph 2 says a skilled singer 'did not memorise a fixed text'.", "Distorts the passage"),
      ]),
      q("detail", "According to the passage, a phrase such as 'swift-footed Achilles' is useful to an oral poet because:", [1], [
        o("it fits a particular place in the rhythm of the line", "Paragraph 2: each formula 'fits a particular slot in the rhythm of the line'."),
        o("it shows off the poet's originality", "Formulas are shared stock, not original phrasing.", "Distorts the passage"),
        o("it is easy to write down", "The point is composing without writing.", "Out of scope"),
        o("audiences demanded new phrases at each performance", "Formulas are repeated phrases.", "Distorts the passage"),
      ]),
      q("inference", "The singers' claim that they performed a song 'the same' each time shows that:", [2], [
        o("they were deliberately misleading the scholars", "Nothing suggests deceit; their idea of sameness differed.", "Distorts the passage"),
        o("for them, sameness meant the same story rather than the same words", "Paragraph 3 says exactly this."),
        o("the recordings of their performances were faulty", "The recordings are trusted evidence in the passage.", "Out of scope"),
        o("they had forgotten their songs", "They composed afresh by design, not through forgetting.", "Distorts the passage"),
      ]),
      q("application", "The author would most likely regard a modern editor's search for the one original wording of the Iliad as:", [3], [
        o("the only proper aim of classical scholarship", "The author questions the idea of a single correct text.", "Extreme wording"),
        o("certain to succeed if enough manuscripts are found", "The author doubts such a text existed in the way editors assume.", "Extreme wording"),
        o("pointless, since the Iliad was never written down", "The poems were written down at some point; how and when is still open.", "Distorts the passage"),
        o("possibly mistaken in what it assumes about how the poem was made", "The last sentence: a single correct text 'may be a poor guide' to how such poetry was made."),
      ]),
    ],
    recall: [
      recall("Where did Parry and Lord record singers?", ["Greece", "Yugoslavia", "Turkey", "Italy"], 1),
      recall("What is the title of Lord's book?", ["The Iliad Explained", "The Singer of Tales", "Songs of the Balkans", "Homer's Memory"], 1),
    ],
  },
  {
    id: "lit-detective",
    title: "The rules of the murder game",
    genre: "literature",
    difficulty: "easy",
    since: "2026-10-18",
    paras: [
      "In 1929 the priest and crime writer Ronald Knox published ten commandments for detective fiction. The criminal must be mentioned early in the story; no more than one secret room or passage is allowed; the detective must not commit the crime himself; and no clue may be hidden from the reader. Knox wrote partly in jest, but his list captured a real ambition of the period's writers. A detective story, in what is now called its golden age, was meant to be a fair contest between author and reader, in which a careful reader could, in principle, solve the crime before the final chapter.",
      "The pleasure of such books was the pleasure of a puzzle. Agatha Christie's plots turn on a single overlooked detail, a clock set wrong or a letter read in the wrong order, and her characters are drawn just firmly enough to serve as suspects. Readers who wanted psychological depth were advised to look elsewhere. The setting is usually closed, a country house or a train cut off by snow, so that the circle of possible culprits is small. Violence happens offstage, and the corpse is less a person than the starting point of an argument.",
      "Not everyone admired the form. In 1944 the American novelist Raymond Chandler complained that such stories were artificial, written by people who knew nothing of real crime, and praised writers who had taken murder 'out of the Venetian vase and dropped it into the alley'. In the hard-boiled fiction he championed, the detective walks through a corrupt city, the solution matters less than the journey, and the crime is a symptom of a society rather than a puzzle with a single answer.",
      "The two traditions are often presented as rivals, but they answer different appetites. The puzzle story offers order: a world briefly disturbed by one crime and then restored by reason. The hard-boiled story offers recognition: a world that cannot be restored, seen clearly by someone who refuses to look away. Many modern crime novels borrow from both, setting a fair-play mystery inside a portrait of a troubled place, which may explain why the genre has outlived every announcement of its decline.",
    ],
    questions: [
      q("main", "Which of the following best expresses the main idea of the passage?", [3], [
        o("Golden-age detective stories were badly written and have rightly been forgotten.", "The author treats the puzzle story as answering a real appetite.", "Distorts the passage"),
        o("Ronald Knox invented the detective story in 1929.", "Knox wrote rules for a form that already existed.", "Distorts the passage"),
        o("Puzzle stories and hard-boiled stories satisfy different desires, order and recognition, and much modern crime fiction combines them.", "This is the argument of the last paragraph, set up by the descriptions before it."),
        o("Raymond Chandler was a better writer than Agatha Christie.", "The passage reports Chandler's complaint but does not rank the two.", "Out of scope"),
      ]),
      q("detail", "According to the passage, golden-age writers set their stories in closed places in order to:", [1], [
        o("keep the circle of possible culprits small", "Paragraph 2: the setting is closed 'so that the circle of possible culprits is small'."),
        o("make the violence more vivid", "Violence 'happens offstage'.", "Distorts the passage"),
        o("show the corruption of modern cities", "That describes hard-boiled fiction.", "Distorts the passage"),
        o("obey one of Knox's commandments", "None of the rules quoted concerns the setting.", "Out of scope"),
      ]),
      q("inference", "Chandler's image of murder taken 'out of the Venetian vase and dropped into the alley' suggests that he valued crime fiction that:", [2], [
        o("relied on elaborate clues and timetables", "That is the puzzle story he criticised.", "Distorts the passage"),
        o("kept violence out of sight", "He wanted crime brought into the rough world, not hidden.", "Distorts the passage"),
        o("was written only by former police officers", "He said puzzle writers knew nothing of real crime, not that only police could write.", "Out of scope"),
        o("placed crime in the rough real world rather than in an elegant, artificial one", "The vase is the refined puzzle; the alley is the street where real crime happens."),
      ]),
      q("application", "Which of the following novels best fits the author's description of many modern crime novels?", [3], [
        o("A locked-room mystery set entirely in a country house, with thinly drawn characters", "This is a pure golden-age puzzle.", "Distorts the passage"),
        o("A mystery that plays fair with its clues while portraying a run-down industrial town and its people", "A fair-play mystery inside a portrait of a troubled place combines both traditions."),
        o("A story in which the detective turns out to be the murderer", "This only breaks one of Knox's rules.", "Out of scope"),
        o("A novel about a corrupt city in which the crime is never solved or explained", "It has the portrait of a place, but no fair-play mystery.", "Half right, half wrong"),
      ]),
    ],
    recall: [
      recall("Who wrote ten commandments for detective fiction?", ["Agatha Christie", "Ronald Knox", "Raymond Chandler", "Arthur Conan Doyle"], 1),
      recall("Where are golden-age stories often set?", ["In a city's back streets", "In a country house or a snowbound train", "In a courtroom", "On a ship at sea"], 1),
    ],
  },
  {
    id: "hist-calendar",
    title: "The days that vanished",
    genre: "history",
    difficulty: "medium",
    since: "2026-10-18",
    paras: [
      "The calendar that Julius Caesar introduced in 46 BCE assumed that a year lasts exactly 365 and a quarter days, and added a leap day every fourth year to keep pace. The true solar year is about eleven minutes shorter. The error is tiny, but it accumulates: by the sixteenth century the calendar had drifted about ten days away from the seasons, and the spring equinox, which the Church used to fix the date of Easter, was arriving around 11 March instead of 21 March.",
      "In 1582 Pope Gregory XIII issued a reform, worked out largely by the astronomers and mathematicians Aloysius Lilius and Christopher Clavius. Ten days were removed at a stroke, so that Thursday 4 October was followed by Friday 15 October, and the leap-year rule was adjusted: century years would be leap years only if divisible by 400. Under the new rule, 1600 and 2000 were leap years but 1700, 1800 and 1900 were not, which keeps the calendar within a day of the sun for thousands of years.",
      "Catholic countries such as Spain, Portugal and the Italian states adopted the change at once. Protestant states were slower, unwilling to accept a reform issued by the Pope, however sound its arithmetic. Sweden tried to switch gradually by skipping leap days, made a mess of it, and for one year had a 30 February. Britain and its colonies held out until 1752, by which time eleven days had to be dropped. Russia changed only after the revolution of 1917, which is why the October Revolution is commemorated in November.",
      "British history adds a popular story: that crowds rioted in 1752, demanding 'Give us our eleven days!' Historians have found little evidence that any such riots took place. The slogan appears in a satirical painting by William Hogarth, and the tale seems to have grown from it, helped by a later fondness for stories of an ignorant public. The episode shows how a joke can harden into fact, and how readily we accept accounts that flatter the present at the expense of the past.",
    ],
    questions: [
      q("main", "Which of the following best summarises the passage?", [0, 2, 3], [
        o("The Julian calendar was accurate, but the Pope changed it for religious reasons.", "It drifted by about ten days; the reform corrected a real error.", "Distorts the passage"),
        o("A small error in the Julian calendar led to a reform that spread unevenly across Europe, and a famous story about it is probably a myth.", "Covers the error, the reform, its slow adoption and the riot story."),
        o("Protestant countries rejected the Gregorian calendar permanently.", "Britain and Sweden adopted it, only later.", "Distorts the passage"),
        o("Easter is now celebrated on the same date every year.", "Nothing is said about Easter falling on a fixed date.", "Out of scope"),
      ]),
      q("detail", "Under the Gregorian rule, which of the following years was NOT a leap year?", [1], [
        o("1600", "The passage names 1600 as a leap year.", "Distorts the passage"),
        o("2000", "The passage names 2000 as a leap year.", "Distorts the passage"),
        o("1996", "It is divisible by 4 and is not a century year, so it is a leap year under either rule.", "Distorts the passage"),
        o("1900", "A century year not divisible by 400, so not a leap year; the passage names it."),
      ]),
      q("inference", "The fact that the October Revolution is commemorated in November shows that:", [2], [
        o("Russia was still using the older Julian calendar in 1917", "The date was October in Russia's calendar but November in the Gregorian one used today."),
        o("Russia had adopted the Gregorian calendar before the revolution", "It changed 'only after the revolution'.", "Distorts the passage"),
        o("the Pope ordered Russia to change its calendar", "Nothing suggests papal involvement in Russia.", "Out of scope"),
        o("the revolution's leaders wished to hide its true date", "No such motive is mentioned.", "Out of scope"),
      ]),
      q("structure", "The author's main purpose in the final paragraph is to:", [3], [
        o("prove that Hogarth's painting caused riots", "The author doubts the riots happened.", "Distorts the passage"),
        o("show that the British public of 1752 was ignorant", "The author criticises that very assumption.", "Distorts the passage"),
        o("question a popular story and draw a lesson about how such stories spread", "It doubts the riots, traces the tale to a painting and draws a moral."),
        o("explain why Britain adopted the reform so late", "That is covered in paragraph 3.", "Distorts the passage"),
      ]),
    ],
    recall: [
      recall("Who issued the 1582 calendar reform?", ["Julius Caesar", "Pope Gregory XIII", "King George II", "Christopher Columbus"], 1),
      recall("How many days did Britain drop in 1752?", ["Ten", "Eleven", "Twelve", "Fourteen"], 1),
    ],
  },
];
