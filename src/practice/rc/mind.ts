import type { RcSet } from "../types";
import { o, q, recall } from "./author";

/** Philosophy and psychology. */
export const MIND: RcSet[] = [
  {
    id: "phil-theseus",
    title: "The ship that was replaced",
    genre: "philosophy",
    difficulty: "medium",
    paras: [
      "The ancient puzzle of the ship of Theseus goes like this. The ship in which the hero returned to Athens was kept as a memorial, and as its planks rotted they were replaced one by one, until no original timber remained. Was it still the same ship? The puzzle sharpens if we imagine that someone collected the discarded planks and assembled them into a second ship. Now there are two candidates for the title, and each has a claim: one has continuity of form and history, the other has all the original material.",
      "Philosophers have offered many answers, but the most interesting response is to ask why we feel there must be an answer at all. We use the word 'same' for several different relations. A river is the same river although its water is entirely new each day; a statue melted down and recast as a bell is the same bronze but not the same statue. When our ordinary criteria agree, as they almost always do, we never notice that there are several of them. The ship of Theseus is unsettling because it pulls them apart.",
      "The puzzle matters because the same pressures apply to persons. The cells of a human body are replaced at different rates, memories fade and are reshaped, and character changes over decades. If I am the same person as the child in an old photograph, what makes it so? Some philosophers point to the continuity of the body, others to chains of memory and psychological connection. Thought experiments involving duplication, in which a person is copied and both copies wake up with the same memories, are designed to show that these criteria, too, can come apart.",
      "The British philosopher Derek Parfit drew a striking conclusion from such cases. Perhaps, he suggested, identity is not what matters. What we care about when we care about our own survival is that there will be someone psychologically continuous with us, who remembers our life and carries on our projects. Whether that someone counts as the same person may be a question with no deep answer, like the question of whether a club that disbands and later re-forms is the same club. Parfit reported that he found this view liberating: the wall between himself and others seemed less solid, and his own death less important.",
      "Not everyone shares his relief. Critics reply that if my future self is merely a close successor, it becomes hard to explain why I should feel special concern for that person, save for my old age, or accept punishment for what I did years ago. The ship of Theseus, it turns out, carries a good deal of cargo.",
    ],
    questions: [
      q("main", "Which of the following best states the main idea of the passage?", [1, 2, 3], [
        o("A puzzle about objects reveals that 'sameness' combines several criteria, which raises hard questions about personal identity.", "Paragraph 2 draws the lesson about several criteria, and paragraphs 3 to 5 apply it to persons."),
        o("The ship rebuilt from the original planks is the real ship of Theseus.", "The passage deliberately does not decide between the two ships.", "Distorts the passage"),
        o("Parfit proved that personal identity does not exist.", "Parfit 'suggested' identity may not be what matters. 'Proved' and 'does not exist' go far beyond that.", "Extreme wording"),
        o("Because human cells are replaced, the body cannot ground personal identity.", "Cell replacement is one detail in paragraph 3. The passage does not reach this conclusion.", "Too narrow or too broad"),
      ]),
      q("structure", "The examples of the river and the bell in the second paragraph serve to:", [1], [
        o("prove that physical objects have no stable identity", "They show different senses of 'same', not that identity is unstable.", "Extreme wording"),
        o("introduce the problem of personal identity", "Personal identity is introduced only in paragraph 3.", "Distorts the passage"),
        o("show that 'same' can name different relations, which normally coincide", "The river keeps its identity despite new water; the bronze survives as the same material but not the same statue. Two criteria, usually in agreement."),
        o("suggest that sameness of material matters more than sameness of form", "The bell example shows the two criteria coming apart, not one outranking the other.", "Distorts the passage"),
      ]),
      q("inference", "It can be inferred that Parfit would most likely agree that:", [3], [
        o("a person who is duplicated dies, and both copies are new people", "Parfit treats such questions as possibly having no deep answer, not as settled in this way.", "Distorts the passage"),
        o("concern for one's own future is irrational and should be abandoned", "He says his death seemed 'less important', not that concern for the future is irrational.", "Extreme wording"),
        o("memory matters less to survival than the continuity of the body", "Parfit stresses psychological continuity, which includes memory.", "Distorts the passage"),
        o("what matters in survival could be kept even if the question of strict identity has no clear answer", "Paragraph 4: what matters is psychological continuity; whether it counts as identity 'may be a question with no deep answer'."),
      ]),
      q("except", "The critics in the final paragraph say Parfit's view makes it hard to explain each of the following EXCEPT:", [4], [
        o("why a person should save money for old age", "Named by the critics.", "True but not the answer"),
        o("why someone should accept punishment for past actions", "Named by the critics.", "True but not the answer"),
        o("why a person should have special concern for their future self", "Named by the critics.", "True but not the answer"),
        o("why a club that re-forms might or might not be the same club", "The club is Parfit's own analogy in paragraph 4, not one of the critics' objections."),
      ]),
    ],
    recall: [
      recall("What happened to the discarded planks in the sharper version of the puzzle?", ["They were burned", "They were assembled into a second ship", "They were kept in a museum", "They were sold"], 1),
      recall("How did Parfit say he found his view?", ["Frightening", "Puzzling", "Liberating", "Irrelevant"], 2),
    ],
  },
  {
    id: "phil-luck",
    title: "Moral luck",
    genre: "philosophy",
    difficulty: "hard",
    paras: [
      "Two drivers have a drink too many at the same party and drive home along similar roads. Both are equally careless; both drift across the line at the same bend. On one road a child steps out, and on the other the road is empty. The first driver kills the child and the second arrives home without incident. Most of us judge the first driver far more harshly, and so does the law. Yet the only difference between them is something neither controlled.",
      "This is the problem that the philosophers Bernard Williams and Thomas Nagel named moral luck. It arises from a collision between two convictions. One is that we should be judged only for what is within our control; it seems unfair to blame someone for the arrival of a child on a dark road. The other is our settled practice of judging people by what they actually do and bring about, which is shaped at every turn by factors beyond their control. The two drivers are only the most vivid case.",
      "Nagel distinguished several kinds of luck. There is luck in outcomes, as with the drivers. There is luck in circumstances: many people who lived quiet, decent lives would have behaved badly had they been born into a time and place that tested them, and many who are condemned would have been blameless in easier conditions. And there is luck in constitution, the temperament and dispositions we did not choose. Pressed far enough, the demand for control seems to leave very little that anyone is responsible for at all.",
      "One response is to insist that the drivers are equally blameworthy and that our harsher reaction to the first is a mistake, perhaps an understandable one, driven by grief and the need to hold someone accountable for a death. On this view the law's distinction between causing death and mere dangerous driving is a concession to feeling rather than a principle. Another response accepts moral luck as a real feature of moral life: we are not pure wills hovering above the world, and what we answer for includes the way our actions turn out.",
      "Williams favoured something like the second view, pointing to what he called agent-regret, the distinctive feeling of someone who has caused harm without fault. A lorry driver who kills a child who ran into the road may be told by everyone that it was not his fault, and yet we would think less of him if he felt nothing more than a bystander would. The existence of that feeling, Williams thought, shows that our relationship to our own actions cannot be captured by the language of control alone.",
    ],
    questions: [
      q("main", "The passage is primarily concerned with:", [1, 3], [
        o("arguing that drink-driving laws should be made more severe", "The law appears only as an illustration of how we judge outcomes.", "Out of scope"),
        o("showing that Williams and Nagel disagreed about whether moral luck exists", "They are presented as jointly naming the problem; no disagreement between them is described.", "Distorts the passage"),
        o("presenting a conflict between the idea that we are responsible only for what we control and the way we actually judge people, along with two responses to it", "Paragraph 2 states the conflict, paragraph 3 extends it, and paragraphs 4 and 5 give the two responses."),
        o("proving that no one is responsible for anything", "Paragraph 3 says the demand for control 'seems' to leave little responsibility, as a problem to be answered, not a conclusion.", "Extreme wording"),
      ]),
      q("inference", "Which of the following can be inferred about 'luck in circumstances'?", [2], [
        o("It applies only to people who commit crimes.", "It applies to the decent as well as the condemned.", "Distorts the passage"),
        o("It implies that some people's good records may owe more to the times they lived in than to their characters.", "Paragraph 3: many decent people 'would have behaved badly' in a testing time and place."),
        o("It shows that temperament is chosen rather than inherited.", "Temperament belongs to luck in constitution, which the passage says we did not choose.", "Distorts the passage"),
        o("It means that people living in difficult times cannot be blamed for anything.", "The passage raises the worry; it does not conclude that no one can be blamed.", "Extreme wording"),
      ]),
      q("structure", "The example of the lorry driver in the final paragraph is used to:", [4], [
        o("show that the law treats accidents too leniently", "The law's treatment of accidents is not discussed here.", "Out of scope"),
        o("illustrate luck in constitution", "The driver illustrates agent-regret about an outcome, not temperament.", "Distorts the passage"),
        o("argue that bystanders should feel the same as those who cause harm", "The point is the reverse: we expect the driver to feel more than a bystander.", "Distorts the passage"),
        o("support the view that people can properly feel answerable for harm they caused without fault", "Williams uses the driver's fitting regret to show responsibility is not only about control."),
      ]),
      q("application", "A person who holds the first response in the fourth paragraph would most likely say that:", [3], [
        o("the two drivers deserve the same blame, whatever the outcome", "The first response insists the drivers are 'equally blameworthy'."),
        o("the first driver deserves more blame because a child died", "That is the ordinary reaction the first response calls a mistake.", "Distorts the passage"),
        o("neither driver deserves any blame, since luck decided everything", "The first response blames both equally; it does not excuse them.", "Extreme wording"),
        o("the law's distinction between the drivers rests on sound principle", "The first response calls that distinction 'a concession to feeling rather than a principle'.", "Distorts the passage"),
      ]),
    ],
    recall: [
      recall("Which two philosophers named the problem of moral luck?", ["Derek Parfit and Bernard Williams", "Thomas Nagel and John Rawls", "Bernard Williams and Thomas Nagel", "Immanuel Kant and David Hume"], 2),
      recall("What did Williams call the feeling of someone who caused harm without fault?", ["Agent-regret", "Moral grief", "Bystander guilt", "Outcome shame"], 0),
    ],
  },
  {
    id: "phil-experts",
    title: "Trusting experts",
    genre: "philosophy",
    difficulty: "medium",
    paras: [
      "Most of what any of us believes about the world we have not checked for ourselves. I believe that the earth orbits the sun, that smoking causes cancer and that a city I have never visited exists, but I could not produce the evidence for any of these if asked. I rely on testimony: on teachers, textbooks, doctors and the long chain of people who stand behind them. Philosophers once treated this dependence as a weakness, a shortcut that the truly rational person would avoid by thinking everything through alone.",
      "That ideal of intellectual self-sufficiency cannot survive contact with modern knowledge. No single person can master the evidence for climate science, vaccine safety and the structure of the atom. The division of cognitive labour is as essential to science as the division of physical labour is to industry. To refuse to trust experts is not to become more rational; it is simply to swap the judgment of specialists for the judgment of whoever one happens to trust instead, usually without noticing the swap.",
      "This does not make trust blind. The problem for a layperson is that the usual way of assessing a claim, examining the evidence, is unavailable. What remains are indirect signs. Does the expert's field have a record of successful prediction? Is there broad agreement among independent specialists, or only among people with a shared interest? Does the expert have a stake in a particular answer? Is the claim being made inside the expert's field, or is a physicist pronouncing on economics? These questions require no technical knowledge, yet they separate reasonable trust from credulity.",
      "Expertise also fails in predictable ways. Specialists tend to be most reliable on questions that resemble cases they have seen many times and least reliable when the world changes in ways their training did not anticipate. A field can also be captured by its own fashions, rewarding agreement and punishing dissent. Healthy institutions build in ways of noticing this: peer review, replication, open publication of data and the protection of awkward critics.",
      "The right attitude, then, is neither deference nor suspicion but something more demanding: calibrated trust, matched to the evidence of reliability that a non-specialist can actually observe. It is harder to practise than either extreme, which may be why both remain so popular.",
    ],
    questions: [
      q("main", "Which of the following best expresses the main idea of the passage?", [1, 2, 4], [
        o("Laypeople should accept whatever experts say, since they cannot check the evidence themselves.", "Paragraph 3 says trust is not blind, and paragraph 5 rejects simple deference.", "Distorts the passage"),
        o("Expert opinion is unreliable because specialists are captured by fashion.", "Capture by fashion is one risk among several, and the passage argues that trust is still rational.", "Half right, half wrong"),
        o("Philosophers were right to treat reliance on testimony as a weakness.", "Paragraph 2 says that ideal 'cannot survive contact with modern knowledge'.", "Distorts the passage"),
        o("Depending on experts is unavoidable and rational, provided trust is matched to signs of reliability that laypeople can observe.", "This joins paragraph 2 (dependence is unavoidable) with paragraphs 3 and 5 (calibrated trust)."),
      ]),
      q("inference", "The author suggests that a person who refuses to trust experts:", [1], [
        o("becomes more rational than someone who trusts them", "Paragraph 2 denies exactly this.", "Distorts the passage"),
        o("usually ends up trusting someone else's judgment without realising it", "Paragraph 2: refusing to trust experts swaps their judgment for someone else's, 'usually without noticing the swap'."),
        o("is more likely to discover new scientific truths", "Discovery is never discussed.", "Out of scope"),
        o("is protected against being misled", "The passage implies the opposite: such a person is misled without noticing.", "Distorts the passage"),
      ]),
      q("application", "By the tests in the third paragraph, which claim should a layperson treat with the most caution?", [2], [
        o("A finding on which many independent research groups agree", "Broad independent agreement is a sign of reliability.", "Distorts the passage"),
        o("A weather service's forecast, given its long record of accurate predictions", "A record of successful prediction is a sign of reliability.", "Distorts the passage"),
        o("A famous chemist's confident forecast about next year's stock market", "The claim falls outside the expert's field, which the passage singles out as a warning sign."),
        o("A doctor's advice on a common condition she treats every day", "Familiar cases inside the expert's field are where specialists are most reliable.", "Distorts the passage"),
      ]),
      q("detail", "Which of the following does the author present as a safeguard used by healthy institutions?", [3], [
        o("Protecting critics who raise awkward objections", "Listed in paragraph 4 with peer review, replication and open data."),
        o("Requiring experts to agree before they publish", "Rewarding agreement is described as a failure, not a safeguard.", "Distorts the passage"),
        o("Letting laypeople review technical evidence", "The passage says this route is unavailable to laypeople.", "Out of scope"),
        o("Limiting experts to questions they have seen before", "Paragraph 4 notes experts are most reliable on familiar questions, but proposes no such limit.", "Distorts the passage"),
      ]),
    ],
    recall: [
      recall("To what does the author compare the division of cognitive labour?", ["A chain of command", "A market", "The division of physical labour in industry", "A library"], 2),
      recall("What attitude does the author recommend?", ["Complete deference", "Constant suspicion", "Self-sufficiency", "Calibrated trust"], 3),
    ],
  },
  {
    id: "psy-planning",
    title: "Why projects run late",
    genre: "psychology",
    difficulty: "easy",
    paras: [
      "Ask people how long a task will take and they will usually give an answer that is too short. Students underestimate how long their essays will take, homeowners underestimate the cost of renovations, and governments underestimate the cost of bridges and railways, often by staggering margins. The psychologists Daniel Kahneman and Amos Tversky called this the planning fallacy: the tendency to predict that one's own plans will go better than similar plans have gone in the past.",
      "The puzzle is that people know the past perfectly well. A student who has finished every essay late will still predict that the next one will be done early. Asked about other people's projects, the same student is far more realistic. The difference seems to lie in how predictions are made. When we think about our own task, we imagine the steps needed to complete it, a story in which each step goes roughly to plan. We rarely imagine the illness, the missing file or the unexpected request that derailed every previous attempt, because each of those was a different surprise.",
      "Kahneman described this as taking the inside view. The alternative, the outside view, ignores the details of the case and asks a simpler question: how long have projects of this kind usually taken? A builder planning a kitchen does better by looking at how long the last twenty kitchens took than by listing the tasks for this one. The outside view feels less informative, because it throws away everything special about the case, but it is usually more accurate for exactly that reason.",
      "Optimism is not the only force at work. In organisations, a realistic estimate can kill a project before it starts, so those who want the project to go ahead have reasons to present the rosy version. Once work has begun and money has been spent, it is hard to abandon even a project that is clearly failing. The planning fallacy therefore has an institutional cousin, in which errors of individual judgment are reinforced by the incentives of the people around them.",
      "Remedies exist, though none is popular. Reference-class forecasting, which builds the outside view into formal budgets, has been adopted by some governments for large infrastructure. Imagining in advance that the project has failed and asking why, an exercise called a premortem, helps teams notice risks they would rather not discuss. The simplest advice is the hardest to follow: when your plan says three weeks, look at how long the last plan took.",
    ],
    questions: [
      q("main", "Which of the following best summarises the passage?", [1, 2, 4], [
        o("Governments are worse at estimating costs than individuals are.", "The passage never compares governments with individuals.", "Out of scope"),
        o("Optimism is the only reason projects run late.", "Paragraph 4 opens: 'Optimism is not the only force at work.'", "Extreme wording"),
        o("Students should start their essays earlier.", "The student is an example, not the point.", "Too narrow or too broad"),
        o("People underestimate how long their own projects will take because they focus on the plan's details, and looking at similar past cases reduces the error.", "This covers the fallacy, its cause (the inside view) and the remedy (the outside view)."),
      ]),
      q("detail", "Why does a student predict that the next essay will be finished early, despite past experience?", [1], [
        o("The student has forgotten that earlier essays were late.", "Paragraph 2 says people 'know the past perfectly well'.", "Distorts the passage"),
        o("The student imagines the steps of this task and overlooks the varied surprises that delayed earlier ones.", "Paragraph 2: we picture a story in which each step goes to plan and rarely imagine the different surprises."),
        o("The student believes other people are slower writers.", "Other people's projects are judged more realistically, but no comparison of speed is made.", "Out of scope"),
        o("Each new essay is shorter than the last.", "Essay length is never mentioned.", "Out of scope"),
      ]),
      q("application", "Which of the following best illustrates taking the 'outside view'?", [2], [
        o("A team lists every task needed to launch its app and adds up the time for each.", "Listing the steps of this case is the inside view.", "Distorts the passage"),
        o("A manager asks the most optimistic engineer for an estimate.", "This makes the error worse and has nothing to do with past cases.", "Out of scope"),
        o("A publisher estimates a new book's schedule from the average delay of its last thirty books.", "It ignores the details of this book and asks how long books like it have taken."),
        o("A homeowner adds a week to the builder's schedule because rain is forecast.", "Adjusting for one detail of this case is still the inside view.", "Half right, half wrong"),
      ]),
      q("inference", "The 'institutional cousin' of the planning fallacy differs from the individual error mainly in that it:", [3], [
        o("arises only in government projects", "The passage speaks of organisations generally.", "Extreme wording"),
        o("is caused by a lack of information about past projects", "The passage stresses that people know the past.", "Distorts the passage"),
        o("can be corrected by a premortem alone", "The premortem is one remedy among several, and none is said to be enough alone.", "Extreme wording"),
        o("is sustained by incentives to present rosy estimates and to continue projects already under way", "Paragraph 4: those who want a project have reasons to present the rosy version, and spent money makes failing projects hard to abandon."),
      ]),
    ],
    recall: [
      recall("Who named the planning fallacy?", ["Daniel Kahneman and Amos Tversky", "Herbert Simon and Daniel Kahneman", "Amos Tversky and Richard Thaler", "Frederic Bartlett"], 0),
      recall("What is the exercise of imagining that a project has already failed called?", ["A postmortem", "A premortem", "A pre-mortgage", "A reference class"], 1),
    ],
  },
  {
    id: "psy-memory",
    title: "Remembering as rebuilding",
    genre: "psychology",
    difficulty: "medium",
    paras: [
      "We tend to picture memory as a recording: an experience is stored somewhere in the brain and, when we remember, the recording is played back, perhaps a little faded. A century of research has made this picture hard to defend. Remembering appears to be less like playing a tape than like reconstructing a scene from fragments, with the gaps filled in by general knowledge, expectation and the questions we are asked.",
      "The British psychologist Frederic Bartlett showed this in the 1930s by asking students to retell an unfamiliar folk tale at intervals. With each retelling the story became shorter, more coherent and more like the stories the students already knew; puzzling details dropped out or were changed into familiar ones. Later experiments found that a single word could shift recall. People who watched a film of a car crash and were asked how fast the cars were going when they 'smashed' into each other gave higher estimates, and were more likely to remember broken glass that was never there, than people asked about cars that 'hit' each other.",
      "Even vivid memories are not exempt. After shocking public events, psychologists have asked people where they were when they heard the news, and then asked them again a year or two later. The accounts often change substantially, yet confidence remains high. The feeling of vividness, it seems, is a poor guide to accuracy.",
      "This has obvious consequences for the law, where eyewitness testimony has long been treated as powerful evidence. Many wrongful convictions later overturned by DNA evidence turned out to rest on confident but mistaken identification. Researchers have proposed changes to how line-ups are run and how witnesses are questioned, so that the procedure itself does not supply the details that the witness then remembers.",
      "It would be a mistake, though, to conclude that memory is simply defective. A system that stored every detail would be costly and, arguably, less useful. Reconstruction allows us to generalise from experience, to imagine the future using the same machinery we use to recall the past, and to make sense of events rather than merely retain them. The price of that flexibility is that memory serves the present as much as it records the past.",
    ],
    questions: [
      q("main", "Which of the following best states the main idea of the passage?", [0, 4], [
        o("Eyewitness testimony should never be used in court.", "The passage proposes better procedures, not a ban.", "Extreme wording"),
        o("Memories of shocking events are more accurate than ordinary memories.", "Paragraph 3 says even vivid memories change while confidence stays high.", "Distorts the passage"),
        o("Memory reconstructs the past rather than replaying it, which makes it prone to error but also flexible.", "Paragraphs 1 to 4 show reconstruction and its errors; paragraph 5 gives its benefits."),
        o("Bartlett's experiment proved that memory works like a recording.", "Bartlett's results count against the recording picture.", "Distorts the passage"),
      ]),
      q("detail", "In the film experiment, people asked about cars that 'smashed' into each other:", [1], [
        o("remembered the speed of the cars more accurately", "They gave higher estimates; nothing suggests greater accuracy.", "Distorts the passage"),
        o("were more likely to recall broken glass that was not in the film", "Stated directly in paragraph 2."),
        o("forgot the crash entirely", "Nothing suggests this.", "Extreme wording"),
        o("gave lower estimates of speed", "They gave higher estimates.", "Distorts the passage"),
      ]),
      q("inference", "Which of the following can be inferred from the third paragraph?", [2], [
        o("A witness's certainty about a memory does not show that the memory is accurate.", "Accounts changed while 'confidence remains high', so confidence is 'a poor guide to accuracy'."),
        o("Memories of public events fade faster than memories of private ones.", "No comparison with private memories is made.", "Out of scope"),
        o("People who report vivid memories are lying.", "The passage describes honest error, not lying.", "Extreme wording"),
        o("Confidence in a memory falls as the memory changes.", "Confidence 'remains high' as accounts change.", "Distorts the passage"),
      ]),
      q("structure", "The final paragraph serves mainly to:", [4], [
        o("propose new ways of questioning witnesses", "That is paragraph 4.", "Distorts the passage"),
        o("argue that memory is too unreliable to be useful", "It argues the opposite: memory should not be seen as simply defective.", "Distorts the passage"),
        o("summarise Bartlett's experiment", "Bartlett is not mentioned in the final paragraph.", "Out of scope"),
        o("qualify the earlier findings by explaining what a reconstructive memory gains", "It says reconstruction lets us generalise, imagine the future and make sense of events."),
      ]),
    ],
    recall: [
      recall("In which decade did Bartlett carry out his folk-tale study?", ["The 1950s", "The 1930s", "The 1970s", "The 1910s"], 1),
      recall("What evidence later overturned many wrongful convictions?", ["Video recordings", "Confessions", "DNA evidence", "Fingerprints"], 2),
    ],
  },
  {
    id: "psy-choice-blind",
    title: "Choosing without knowing why",
    genre: "psychology",
    difficulty: "medium",
    paras: [
      "In a study published in 2005, researchers showed volunteers pairs of photographs of faces and asked them to choose the more attractive one. After each choice, the experimenter slid the chosen card across the table and asked the volunteer to explain the preference. On some trials, using a simple card trick, the experimenter handed over the face the volunteer had rejected. Most of the time, no one noticed. More striking still, volunteers went on to explain why they preferred a face they had not chosen, sometimes citing features, such as earrings, that only the rejected face had.",
      "The researchers called the phenomenon choice blindness, and they have since found it in many settings. Shoppers tasting two jams and two teas failed to notice when the samples were secretly swapped before they explained their preference; the jars had two compartments, so a quiet flip did the trick. In a survey on political questions, respondents whose answers had been reversed on the page defended positions they had just rejected, and some even shifted their later views towards the reversed answers.",
      "Such findings fit an older argument in psychology: that people have less access to the causes of their own behaviour than they believe. In the 1970s, the psychologists Richard Nisbett and Timothy Wilson had shown that people readily give confident reasons for behaviour that experiments traced to quite different causes. When asked why we chose something, we may not be reporting a reason that drove the choice so much as constructing a plausible story after the fact. The story feels like memory, and we have no inner signal that tells us when we are inventing rather than recalling.",
      "It would be wrong, however, to conclude that people's stated reasons are worthless. Detection rates rise sharply when the swapped options are very different, or when people care a great deal about the decision. Choice blindness shows that our sense of knowing our own minds is fallible, not that it is always mistaken. Its practical lesson may be modest: surveys, interviews and even our own diaries record what people say about their choices, which is not the same thing as why they made them.",
    ],
    questions: [
      q("main", "The passage is primarily concerned with:", [0, 2, 3], [
        o("showing that people's explanations of their choices can be built after the fact, while warning against dismissing such explanations altogether", "Paragraphs 1 to 3 show reasons being constructed; paragraph 4 says stated reasons are fallible, not worthless."),
        o("proving that people never know why they make their decisions", "Paragraph 4 says our self-knowledge is 'fallible, not that it is always mistaken'.", "Extreme wording"),
        o("describing a card trick that psychologists use to study attractiveness", "The trick is only the method of one study; the passage is about self-knowledge.", "Too narrow or too broad"),
        o("arguing that political surveys should no longer be trusted", "The survey is one example, and the passage draws only a modest lesson about what surveys record.", "Out of scope"),
      ]),
      q("except", "All of the following are presented as evidence of choice blindness EXCEPT:", [0, 1, 3], [
        o("volunteers explaining a preference for a face they had in fact rejected", "This is the first study's central finding.", "True but not the answer"),
        o("tasters failing to notice that jams and teas had been swapped", "Paragraph 2 gives this as one of the settings.", "True but not the answer"),
        o("respondents defending political positions they had just rejected", "Paragraph 2 gives this as another setting.", "True but not the answer"),
        o("people noticing swaps more often when the options were very different", "Paragraph 4 gives this as a limit on choice blindness, not evidence for it."),
      ]),
      q("structure", "The author mentions earrings in the first paragraph most likely in order to:", [0], [
        o("show how carefully the volunteers examined the photographs", "Volunteers did not even notice the swap, so they were not examining carefully.", "Distorts the passage"),
        o("show that the explanations were drawn from the face in hand, not remembered from the choice", "Citing a feature only the rejected face had proves the reason was built on the spot."),
        o("suggest that jewellery strongly affects judgements of attractiveness", "Nothing is said about what makes a face attractive.", "Out of scope"),
        o("prove that the card trick sometimes failed", "The trick worked; that is why the volunteers described the wrong face.", "Distorts the passage"),
      ]),
      q("inference", "Which of the following would the author most likely accept?", [3], [
        o("A customer feedback form shows exactly why customers bought a product.", "The last sentence says such records show what people say, not why they chose.", "Distorts the passage"),
        o("With enough practice, introspection becomes an infallible guide to our motives.", "Nothing suggests self-knowledge can be made infallible.", "Extreme wording"),
        o("People who care a great deal about a decision are more likely to notice if it is switched.", "Paragraph 4: detection rates rise sharply when people care a great deal about the decision."),
        o("Choice blindness occurs only in laboratory tests with photographs.", "Paragraph 2 says it has been found in many settings, including tasting and surveys.", "Distorts the passage"),
      ]),
    ],
    recall: [
      recall("What were volunteers first asked to choose between?", ["Two jams", "Two photographs of faces", "Two political statements", "Two cups of tea"], 1),
      recall("When did people notice swaps much more often?", ["When the options were very different", "When the experimenter left the room", "When they were paid", "When the photos were in colour"], 0),
    ],
  },
  {
    id: "psy-willpower",
    title: "Is willpower a muscle?",
    genre: "psychology",
    difficulty: "hard",
    paras: [
      "In a well-known experiment from the late 1990s, hungry volunteers sat in a room that smelled of freshly baked cookies. Some were allowed to eat the cookies; others had to eat radishes instead and leave the cookies untouched. Afterwards, all of them worked on a puzzle that, unknown to them, could not be solved. Those who had resisted the cookies gave up considerably sooner. The effect was large, and the design was easy to copy. The researchers proposed that self-control draws on a limited resource, which is used up by one act of restraint and leaves less for the next.",
      "The idea, soon called ego depletion, was attractive because it matched ordinary experience: after a day of difficult decisions, the biscuit tin is harder to resist. Hundreds of studies appeared to confirm it, and some researchers went further, suggesting that the resource was glucose and that a sugary drink could restore flagging willpower. Popular books advised readers to schedule hard choices for the morning and to treat willpower like a muscle that tires with use.",
      "Doubts grew as psychology began to examine its own methods. Small studies, flexible analyses and a tendency to publish only positive results can together produce a literature full of effects that are not really there. In 2016, a project involving more than twenty laboratories ran the same carefully specified depletion task and found an effect close to zero. The laboratories had agreed on the procedure and published their plan before collecting any data, which left no room for flexible analysis. The glucose explanation fared no better; critics pointed out that the brain's use of sugar barely changes during demanding mental work.",
      "The story is not simply one of a theory overturned. Later large studies have produced mixed results, and some researchers argue that the tasks used were too weak to deplete anyone. Others found that people who believe willpower is limited show depletion-like effects, while those who do not show little. If so, fatigue after effort may be real but shaped by expectation rather than by a fuel gauge in the brain. What the episode clearly shows is how a finding that seems to explain everyday life can spread far beyond the strength of its evidence.",
    ],
    questions: [
      q("tone", "The author's attitude towards the theory of ego depletion is best described as:", [2, 3], [
        o("enthusiastic support, since hundreds of studies confirmed it", "The author stresses that the evidence was weaker than those studies suggested.", "Distorts the passage"),
        o("cautious scepticism: the evidence turned out weaker than the theory's popularity suggested", "The last paragraph keeps some effect open but says the finding spread 'far beyond the strength of its evidence'."),
        o("outright dismissal of any link between effort and fatigue", "The author allows that 'fatigue after effort may be real'.", "Extreme wording"),
        o("indifference, since the debate has no practical importance", "The author draws a clear lesson from the episode.", "Distorts the passage"),
      ]),
      q("detail", "According to the passage, the 2016 project involving many laboratories:", [2], [
        o("found that a sugary drink restored self-control", "The glucose explanation 'fared no better'.", "Distorts the passage"),
        o("ran the same carefully specified task and found an effect close to zero", "Paragraph 3 says exactly this."),
        o("proved that self-control does not exist", "It tested one effect, not whether self-control exists.", "Extreme wording"),
        o("showed that the cookie experiment had been made up", "No one is accused of inventing data.", "Out of scope"),
      ]),
      q("strengthen", "Which of the following, if true, would most support the suggestion in the last paragraph that depletion is shaped by expectation?", [3], [
        o("Volunteers told that mental effort is energising persist longer after a hard task than volunteers told it is tiring.", "Changing only the belief changes the after-effect, which is what the expectation view predicts."),
        o("The brain's use of glucose rises sharply during difficult mental tasks.", "This would support the fuel-gauge view that the paragraph sets aside, not expectation.", "Distorts the passage"),
        o("Small studies are more likely than large ones to report positive results.", "This explains why the literature misled, but says nothing about expectation.", "True but not the answer"),
        o("People who resist cookies always give up sooner on puzzles.", "'Always' goes beyond any finding in the passage, and it says nothing about belief.", "Extreme wording"),
      ]),
      q("structure", "The third paragraph serves mainly to:", [2], [
        o("describe the original experiment in more detail", "The experiment is described in paragraph 1.", "Distorts the passage"),
        o("show that psychology's methods are now beyond criticism", "It describes methods that went wrong.", "Extreme wording"),
        o("argue that popular books on willpower should be withdrawn", "No such recommendation is made.", "Out of scope"),
        o("explain why the evidence for ego depletion came to be doubted", "It gives the methodological reasons, the failed replication and the problem with glucose."),
      ]),
    ],
    recall: [
      recall("What did some volunteers have to eat instead of the cookies?", ["Apples", "Radishes", "Bread", "Carrots"], 1),
      recall("How many laboratories took part in the 2016 project?", ["About five", "More than twenty", "Exactly two", "Over two hundred"], 1),
    ],
  },
  {
    id: "phil-future",
    title: "Can we harm people who do not exist yet?",
    genre: "philosophy",
    difficulty: "hard",
    paras: [
      "Most of us believe we can wrong people who do not yet exist. A government that buries nuclear waste in a way that will leak in three hundred years seems to act badly towards the people living then, even though none of them is alive today. Much of what we think we owe the future rests on cases like this. The philosopher Derek Parfit showed that explaining the belief is surprisingly difficult.",
      "His argument begins with a simple fact about reproduction. Who is born depends on exactly when conception happens, and that depends on countless details of people's lives. Had your parents met a year later, or even conceived a child a month later, someone else would have been born in your place. A major policy, such as a choice between using up a resource quickly or conserving it, changes how millions of people live, work and meet one another. Within a few generations, the people who exist under one policy will be entirely different individuals from those who would have existed under the other.",
      "Suppose, then, that we choose rapid depletion, and that people two centuries from now have a lower, though still worthwhile, quality of life than their counterparts would have had under conservation. Have we harmed them? It seems not, in the ordinary sense of harm, which means making someone worse off than they would otherwise have been. Had we chosen conservation, these particular people would never have been born at all. Since their lives are worth living, our choice has not made any of them worse off. Yet the choice still seems wrong.",
      "Parfit called this the non-identity problem, and he concluded that our moral thinking cannot rest entirely on harm to particular persons. What matters, he suggested, is the quality of life of whoever will exist, whoever they turn out to be. The problem bears directly on debates about climate change, where policies chosen now will shape both how future people live and which people there will be. An argument that future generations cannot complain because they owe their very existence to our choices is not a curiosity of philosophy seminars; it is a position someone could seriously advance, which is why answering it matters.",
    ],
    questions: [
      q("main", "Which of the following best states the main point of the passage?", [1, 2, 3], [
        o("Because our choices decide who will exist, they may not harm particular future people, so wrongs to future generations must be explained in other terms.", "This is the non-identity problem and Parfit's conclusion in paragraph 4."),
        o("We have no moral duties towards people who do not yet exist.", "The choice 'still seems wrong', and Parfit looks for a better basis for the duty, not its absence.", "Distorts the passage"),
        o("Conservation policies always produce happier future generations.", "The example compares two possible futures; nothing is claimed about 'always'.", "Extreme wording"),
        o("Nuclear waste should be stored more safely than it is today.", "Nuclear waste is only the opening illustration.", "Out of scope"),
      ]),
      q("structure", "The second paragraph mainly establishes that:", [1], [
        o("most people are born at random", "It says birth depends on countless details, not that it is random.", "Distorts the passage"),
        o("large policies change which individuals are born, not just how they live", "This is the premise the depletion example needs."),
        o("governments should control when people conceive children", "No such proposal is made.", "Out of scope"),
        o("using up resources quickly lowers the birth rate", "The paragraph is about who is born, not how many.", "Distorts the passage"),
      ]),
      q("detail", "According to the passage, the choice of rapid depletion does not harm the future people in the example because:", [2], [
        o("their quality of life is higher than it would have been", "It is lower than their counterparts' would have been.", "Distorts the passage"),
        o("harm can only be done to people who are alive today", "The passage never says this; the argument rests on who would have existed.", "Extreme wording"),
        o("the effects of depletion are two centuries away", "Distance in time is not the reason given.", "True but not the answer"),
        o("they would not have existed under the other policy, and their lives are worth living", "Paragraph 3: had we conserved, 'these particular people would never have been born', so none is worse off."),
      ]),
      q("application", "Which of the following arguments is closest to the one the author says 'someone could seriously advance'?", [3], [
        o("We must cut emissions because future people will be worse off than they would otherwise have been.", "This is the ordinary harm argument that the non-identity problem undermines.", "Distorts the passage"),
        o("Philosophy seminars should not discuss climate change.", "The author says the problem matters well beyond seminars.", "Out of scope"),
        o("We need not cut emissions for future people's sake, since another policy would have produced different people, and those who exist cannot complain of existing.", "This uses non-identity to excuse the choice, which is the position the last sentence warns about."),
        o("Future people will be happier than us, so we owe them nothing.", "The argument the author warns of rests on who exists, not on how happy they are.", "Distorts the passage"),
      ]),
    ],
    recall: [
      recall("Whose argument does the passage discuss?", ["Derek Parfit", "John Rawls", "Peter Singer", "Immanuel Kant"], 0),
      recall("Which example policy does the passage work through?", ["Building roads", "Using up or conserving a resource", "Raising taxes", "Banning cars"], 1),
    ],
  },
];
