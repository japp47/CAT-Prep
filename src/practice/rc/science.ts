import type { RcSet } from "../types";
import { o, q, recall } from "./author";

export const SCIENCE: RcSet[] = [
  {
    id: "sci-shrinking",
    title: "Smaller birds in a warming world",
    genre: "science",
    difficulty: "medium",
    paras: [
      "In the nineteenth century the biologist Carl Bergmann noticed that, within groups of related warm-blooded animals, those living in colder places tend to be larger. A large body has less surface area relative to its volume than a small one, so it loses heat more slowly; in the cold, size is an advantage, and in the heat a smaller body sheds warmth more easily. The pattern, now called Bergmann's rule, holds loosely but widely, from deer to sparrows.",
      "If the rule reflects a response to temperature, a warming climate should make animals smaller, and there is evidence that it is doing so. One of the most striking studies used more than seventy thousand birds of over fifty species that had died after flying into buildings in Chicago over four decades. Measured specimen by specimen, their bodies became steadily smaller over the period while their wings grew slightly longer. Similar trends have been reported in birds in the Amazon and in several mammal species.",
      "Interpreting such trends is harder than documenting them. Body size is affected by food supply, which a changing climate can also alter, and by conditions while young animals grow; a smaller adult may simply reflect a lean season in the nest rather than any inherited change. Researchers also have to rule out a quieter explanation: that collectors, or the circumstances of death, favoured particular birds in different decades. The Chicago study is valuable partly because the way its birds were collected changed little over time.",
      "The longer wings are a puzzle in their own right. One suggestion is that they compensate for smaller bodies, helping birds keep the ability to fly the long distances of their migrations. Another is that wing length and body mass respond differently to the same conditions during development, so that the two trends are linked without either causing the other.",
      "Shrinking is not necessarily a sign of successful adaptation. A smaller body may help an animal cope with heat but leave it with fewer reserves for cold snaps, storms or long flights, and changes in size can alter which predators and prey an animal encounters. What the trends show is that climate change is not only shifting where species live and when they breed; it is reshaping the bodies of animals that stay put.",
    ],
    questions: [
      q("main", "Which of the following best captures the main point of the passage?", [1, 2, 4], [
        o("Evidence suggests that warming is making some animals smaller, but explaining and judging the trend is complicated.", "Paragraph 2 gives the evidence; paragraphs 3 to 5 show the difficulties of interpreting and evaluating it."),
        o("Bergmann's rule has been disproved by studies of birds.", "The studies are consistent with the rule; nothing is disproved.", "Distorts the passage"),
        o("Birds are adapting successfully to climate change by growing longer wings.", "Paragraph 5 warns that shrinking is not necessarily successful adaptation, and the wings remain a puzzle.", "Distorts the passage"),
        o("Collisions with buildings are a major threat to migratory birds.", "The collisions are only how the specimens were obtained.", "Out of scope"),
      ]),
      q("detail", "Why does the author consider the Chicago study especially valuable?", [2], [
        o("It measured birds that were still alive.", "The birds had died after flying into buildings.", "Distorts the passage"),
        o("It included every bird species found in North America.", "It covered 'over fifty species', not every species.", "Extreme wording"),
        o("Its method of collecting birds stayed largely the same over the decades it covered.", "Paragraph 3: valuable 'partly because the way its birds were collected changed little over time', which rules out a collection bias."),
        o("It proved that the changes in size were inherited.", "Paragraph 3 says inherited change is hard to separate from growing conditions.", "Distorts the passage"),
      ]),
      q("strengthen", "Which of the following, if true, would most weaken the claim that warming caused the decline in body size?", [2], [
        o("Birds of the same species remain larger in colder regions than in warmer ones.", "This fits Bergmann's rule and leaves the warming explanation intact.", "Out of scope"),
        o("Several mammal species have also become smaller in recent decades.", "This extends the trend and, if anything, supports the warming explanation.", "Distorts the passage"),
        o("Wing length increased more in some species than in others.", "Variation in wing growth says nothing about what caused bodies to shrink.", "Out of scope"),
        o("The decline in size closely follows a fall in the insects that adults feed their young, a fall that happened for reasons unrelated to temperature.", "This offers the alternative cause the passage itself raises in paragraph 3, food supply during growth, which weakens the warming explanation."),
      ]),
      q("inference", "The final paragraph suggests that a smaller body:", [4], [
        o("is proof that a species is thriving", "The paragraph says shrinking is not necessarily a sign of successful adaptation.", "Extreme wording"),
        o("can bring disadvantages as well as help in coping with heat", "It may help with heat but leave fewer reserves for cold snaps, storms and long flights."),
        o("protects animals from predators", "Size changes alter which predators are met; protection is not claimed.", "Distorts the passage"),
        o("is found only in animals that migrate", "Nothing restricts the effect to migrants.", "Out of scope"),
      ]),
    ],
    recall: [
      recall("How had the birds in the large study died?", ["In a forest fire", "After flying into buildings in Chicago", "From disease in the Amazon", "From lack of food in winter"], 1),
      recall("What happened to the birds' wings over the period?", ["They grew shorter", "They stayed the same", "They grew slightly longer", "They changed colour"], 2),
    ],
  },
  {
    id: "sci-wood",
    title: "The wood wide web",
    genre: "science",
    difficulty: "hard",
    paras: [
      "Beneath a forest floor, the roots of many trees are wrapped in threads of fungi. The relationship, called mycorrhiza, is ancient and usually beneficial to both sides: the fungus gathers water and minerals from the soil and passes some to the tree, which in return feeds the fungus sugars made by photosynthesis. Because a single fungus can connect to several trees, and a single tree to several fungi, ecologists began in the 1990s to describe forests as linked by underground networks.",
      "From this point the story grew rapidly in the telling. Experiments using tracer chemicals suggested that carbon could pass between trees through fungal links. Popular books and articles described a 'wood wide web' through which mother trees nurtured their seedlings, warned neighbours of insect attack and shared food with the sick. The picture was moving, and it changed how many people thought about forests: not as collections of competing individuals but as cooperative communities.",
      "A number of researchers have since argued that the popular account ran well ahead of the evidence. Reviewing field studies, they found that shared networks linking trees in the wild had been demonstrated in only a few forest types; that most claims of resources moving between trees came from experiments that could not rule out other routes, such as movement through the soil itself; and that evidence for preferential help to related seedlings was thin and inconsistent. Some studies, they noted, had been cited in ways that overstated what the original work found.",
      "The critics did not claim that the networks are a myth. Fungal connections are real, and transfers of carbon and nitrogen through them may well occur. Their objection was to the inflation of tentative findings into confident stories, a process in which each retelling dropped a qualification. They also pointed out that, from the fungus's point of view, any transfer between trees might serve its own interests rather than those of the trees, which makes talk of cooperation and nurturing at best a metaphor.",
      "The episode is less a scandal than an illustration of how scientific ideas travel. A finding enters the world hedged with caveats; the caveats are the first thing to go. Correcting the story does not require abandoning the wonder that drew people to it. It requires accepting that a forest may be remarkable for reasons less sentimental than the ones we were first told.",
    ],
    questions: [
      q("main", "Which of the following best states the main idea of the passage?", [2, 3, 4], [
        o("Researchers have shown that the wood wide web is a myth.", "Paragraph 4: 'The critics did not claim that the networks are a myth.'", "Distorts the passage"),
        o("Although underground fungal networks exist, popular claims about trees cooperating through them have gone beyond the evidence.", "Paragraphs 2 and 3 describe the inflated story and the review; paragraph 4 affirms that the networks are real."),
        o("Trees in forests compete rather than cooperate.", "The passage does not replace one story with its opposite.", "Distorts the passage"),
        o("Fungi depend on trees for water and minerals.", "It is the other way round: fungi supply water and minerals and receive sugars.", "Distorts the passage"),
      ]),
      q("except", "The review described in the third paragraph raised all of the following concerns EXCEPT that:", [2], [
        o("shared networks had been demonstrated in only a few forest types", "Stated in paragraph 3.", "True but not the answer"),
        o("some experiments could not rule out transfer through the soil", "Stated in paragraph 3.", "True but not the answer"),
        o("evidence of special help to related seedlings was weak", "Stated in paragraph 3.", "True but not the answer"),
        o("tracer chemicals harm the trees they are used on", "Harm from tracers is never mentioned, so this is the exception."),
      ]),
      q("inference", "The critics' point that transfers might serve the fungus's interests implies that:", [3], [
        o("fungi harm the trees they connect", "The relationship is described as usually beneficial to both sides.", "Distorts the passage"),
        o("no carbon ever passes between trees", "The critics allow that transfers 'may well occur'.", "Extreme wording"),
        o("an observed movement of carbon between trees would not by itself show that the trees were cooperating", "If the fungus may be acting for itself, a transfer cannot be read as trees helping each other."),
        o("trees gain nothing from mycorrhiza", "Trees receive water and minerals, as paragraph 1 states.", "Distorts the passage"),
      ]),
      q("tone", "The author's attitude to the popular account of the wood wide web is best described as:", [4], [
        o("contemptuous of the scientists who first proposed it", "The author calls the episode 'less a scandal' and blames retelling, not scientists.", "Extreme wording"),
        o("wholly approving, since it changed public views of forests", "The author endorses the critics' case that it overstated the evidence.", "Distorts the passage"),
        o("indifferent, since the debate is purely technical", "The final paragraph takes a clear position.", "Distorts the passage"),
        o("sympathetic to the wonder it inspired but critical of its overstatement", "Paragraph 5: correcting the story 'does not require abandoning the wonder', but the caveats should not be dropped."),
      ]),
    ],
    recall: [
      recall("When did ecologists begin describing forests as linked by underground networks?", ["In the 1960s", "In the 1990s", "In the 2010s", "In the 1940s"], 1),
      recall("What do trees give the fungus in return for water and minerals?", ["Nitrogen", "Shade", "Sugars made by photosynthesis", "Seeds"], 2),
    ],
  },
  {
    id: "sci-placebo",
    title: "The power of a sugar pill",
    genre: "science",
    difficulty: "medium",
    paras: [
      "In a well-designed drug trial, some patients receive the drug and others a placebo, an inactive substance made to look identical. Neither the patients nor the doctors treating them know who has received which. The point of this arrangement is not only to see whether the drug works but to measure how much better it works than the simple experience of being treated. That second quantity is often surprisingly large.",
      "Patients given placebos frequently report less pain, better sleep and improved mood. Some of this improvement has nothing to do with the pill at all. Many conditions get better on their own, and people tend to enter trials when their symptoms are at their worst, so some recovery is to be expected whatever is done; statisticians call this regression to the mean. A trial that compared the drug only with no treatment at all would wrongly credit the drug with this natural improvement.",
      "But not all of the placebo response can be explained away. In studies of pain, placebos can trigger the release of the brain's own pain-relieving chemicals, and drugs that block those chemicals reduce the placebo effect. The colour, price and size of a pill can change how much relief it gives, and so can the warmth and confidence of the person giving it. Expectation, it appears, has real physiological effects, at least for symptoms such as pain and nausea that the brain itself regulates.",
      "The response appears to have grown in some fields. Analyses of antidepressant and pain trials have found that patients receiving placebos improved more in recent decades than in earlier ones, which makes it harder for new drugs to show an advantage. Explanations range from changes in who enrols in trials to the growing size and length of trials, with their more frequent contact between patients and staff.",
      "This has prompted an odd question: could placebos be used deliberately? Some small studies have given patients pills openly described as placebos and still found improvements in conditions such as irritable bowel syndrome. The results are intriguing but limited, and no one suggests that a sugar pill can shrink a tumour. What they do suggest is that the context of care is not mere packaging around the active treatment. It is part of the treatment.",
    ],
    questions: [
      q("main", "Which of the following best captures the main idea of the passage?", [1, 2, 4], [
        o("Placebos are as effective as most drugs.", "Nothing in the passage supports this comparison.", "Extreme wording"),
        o("Drug trials are unreliable because of the placebo response.", "Placebo groups are what make trials reliable; the passage criticises no trial design except one without a placebo.", "Distorts the passage"),
        o("Regression to the mean explains the whole placebo response.", "Paragraph 3 says 'not all of the placebo response can be explained away'.", "Distorts the passage"),
        o("Improvement in patients given placebos has several sources, some of them real effects of expectation, which matter for both trials and care.", "Paragraph 2 gives regression, paragraph 3 expectation, and paragraphs 4 and 5 the consequences for trials and care."),
      ]),
      q("structure", "The author mentions regression to the mean in order to:", [1], [
        o("explain part of the improvement in placebo groups that the placebo itself does not cause", "It accounts for natural recovery from a low point, which would occur whatever was done."),
        o("show that placebos are useless", "Paragraph 3 goes on to show that placebos have real effects.", "Extreme wording"),
        o("argue that trials should compare drugs with no treatment", "The passage says such a comparison would wrongly credit the drug.", "Distorts the passage"),
        o("explain why placebos release pain-relieving chemicals", "That is a separate mechanism, described in paragraph 3.", "Distorts the passage"),
      ]),
      q("inference", "Which of the following is most strongly supported by the fourth paragraph?", [3], [
        o("Recent drugs are less effective than older ones.", "The difficulty comes from larger placebo responses, not weaker drugs.", "Distorts the passage"),
        o("A new drug may find it harder to beat a placebo today than a similar drug would have decades ago.", "Placebo groups now improve more, which 'makes it harder for new drugs to show an advantage'."),
        o("Larger trials are always less accurate than smaller ones.", "Trial size is offered as one possible explanation, with no claim about accuracy.", "Extreme wording"),
        o("Placebo responses have grown in every area of medicine.", "The paragraph says 'in some fields'.", "Extreme wording"),
      ]),
      q("strengthen", "Which finding would most support the claim that expectation has 'real physiological effects'?", [2], [
        o("Many patients enter trials when their symptoms are at their worst.", "This supports regression to the mean, the explanation that does not involve expectation.", "Distorts the passage"),
        o("More expensive brands of pills sell better than cheap ones.", "Sales figures say nothing about effects in the body.", "Out of scope"),
        o("Pain relief from a placebo disappears when patients are given a drug that blocks the brain's natural painkillers.", "This ties the placebo's effect to a measurable chemical process in the body."),
        o("Some conditions improve without any treatment.", "Natural improvement is unrelated to expectation.", "Out of scope"),
      ]),
    ],
    recall: [
      recall("What is a placebo, as defined in the passage?", ["A weaker dose of the drug", "An inactive substance made to look identical to the drug", "A herbal remedy", "A drug that blocks pain"], 1),
      recall("Which condition improved in studies of openly labelled placebos?", ["Irritable bowel syndrome", "Cancer", "Diabetes", "Asthma"], 0),
    ],
  },
];
