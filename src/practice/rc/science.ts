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
  {
    id: "sci-microbiome",
    title: "The crowd inside us",
    genre: "science",
    difficulty: "medium",
    paras: [
      "Each of us carries tens of trillions of microbes in the gut, a community whose cells roughly match the number of human cells in the body. For most of medical history these organisms were treated mainly as a source of infection. Over the past two decades, cheap genetic sequencing has made it possible to catalogue them in detail, and the results have changed how scientists think about the body. The gut's microbes help digest fibre, make vitamins, train the immune system and keep harmful species in check.",
      "Enthusiasm soon outran the evidence. Studies linked differences in gut microbes to obesity, depression, autism and dozens of other conditions, and a market in probiotic supplements grew rapidly. Many of these links, however, came from comparing the microbes of sick and healthy people, which shows that the two groups differ but not which difference came first. Illness changes diet, medication and daily habits, all of which reshape the microbial community, so the microbes may be a consequence of a disease rather than its cause.",
      "Experiments in mice offer a way round this problem, since animals raised without any microbes can be given the microbes of a particular donor. When germ-free mice received gut microbes from obese people, some gained more fat than mice given microbes from lean people. Such results are striking, but mice differ from humans in diet, anatomy and the microbes that naturally live in them, and effects in an animal raised in a sterile bubble may not appear in a person who has carried a complex microbial community since birth. Researchers have also moved microbes from people with depression into rats and seen changes in behaviour, results that are intriguing but open to the same doubts.",
      "The clearest success so far is narrower than the headlines. Patients with repeated infections of the bacterium Clostridioides difficile, often after courses of antibiotics, recover in most cases when given stool from a healthy donor, which restores a diverse community that keeps the bacterium in check. That treatment works because the cause is well understood. Even so, donors are now carefully screened, since stool can carry infections of its own. For most other conditions, the microbiome remains a promising field of research rather than a source of proven cures.",
    ],
    questions: [
      q("main", "Which of the following best captures the main idea of the passage?", [1, 2, 3], [
        o("Gut microbes have been shown to cause obesity, depression and autism.", "Paragraph 2 says these links may run the other way.", "Distorts the passage"),
        o("Experiments on mice are useless for medical research.", "Mouse studies are called 'striking' but limited, not useless.", "Extreme wording"),
        o("Gut microbes matter, but most claimed health effects are not yet shown to be causes, with a few well-understood exceptions.", "Covers the promise, the caution and the C. difficile exception."),
        o("Probiotic supplements are the best way to improve health.", "The supplement market is mentioned only as a sign of hype.", "Out of scope"),
      ]),
      q("inference", "The author's point about comparing the microbes of sick and healthy people is that such studies:", [1], [
        o("cannot show whether a microbial difference causes an illness or results from it", "Paragraph 2: they show the groups differ 'but not which difference came first'."),
        o("always find that healthy people carry more microbes", "Nothing is said about numbers of microbes.", "Extreme wording"),
        o("are more reliable than experiments in mice", "Mouse experiments are presented as a way round their weakness.", "Distorts the passage"),
        o("prove that diet has no effect on the microbiome", "Paragraph 2 says diet reshapes the microbial community.", "Distorts the passage"),
      ]),
      q("strengthen", "Which of the following, if true, would most weaken the conclusion suggested by the mouse experiments in the third paragraph?", [2], [
        o("Mice raised in the ordinary way carry microbes that differ from those of humans.", "The passage already notes this limit; it does not undercut the comparison between donors.", "True but not the answer"),
        o("Germ-free mice gain the same amount of fat whether their microbes come from lean or obese donors.", "If donor type makes no difference, the experiments no longer point to obesity-related microbes."),
        o("Obese people often eat less fibre than lean people.", "This concerns diet in people, not what the mouse results show.", "Out of scope"),
        o("Stool transplants cure most repeated C. difficile infections.", "True, but it is about a different condition.", "True but not the answer"),
      ]),
      q("detail", "The treatment for Clostridioides difficile is described as working because:", [3], [
        o("it uses antibiotics to kill every bacterium in the gut", "Antibiotics often come before the infection; the treatment restores microbes.", "Distorts the passage"),
        o("it was first tested on germ-free mice", "Nothing is said about how it was tested.", "Out of scope"),
        o("it also cures obesity and depression", "The paragraph calls it a narrow success.", "Distorts the passage"),
        o("its cause is well understood, and donor stool restores a community that holds the bacterium in check", "Paragraph 4 says both."),
      ]),
    ],
    recall: [
      recall("What made it possible to catalogue gut microbes in detail?", ["Cheap genetic sequencing", "Better microscopes", "Germ-free mice", "Probiotic supplements"], 0),
      recall("Which infection does a stool transplant treat successfully?", ["Malaria", "Clostridioides difficile", "Tuberculosis", "Influenza"], 1),
    ],
  },
  {
    id: "sci-leapsecond",
    title: "The end of the leap second",
    genre: "science",
    difficulty: "hard",
    paras: [
      "For most of history, time was defined by the sky. A day was one turn of the Earth, and the second was a fraction of that day. In 1967 scientists cut this link, redefining the second by the vibrations of caesium atoms, which are far steadier than the planet's spin. The best atomic clocks now keep time so precisely that they would drift by less than a second over many millions of years.",
      "The Earth, by comparison, is a poor timekeeper. Tides slowly brake its rotation, and movements of its molten core, its oceans and even its ice sheets make the length of the day wobble by fractions of a millisecond. Left alone, atomic time and the time of the sun would gradually part company. Since 1972, the world's official time scale has kept them together by occasionally adding a leap second, an extra second inserted at the end of a June or December day when the gap approaches nine-tenths of a second.",
      "For the computers that now run telecommunications, finance and navigation, the leap second is a nuisance. Software that assumes every minute has sixty seconds can stumble on a minute with sixty-one, and a leap second in 2012 contributed to outages at several large websites. Because leap seconds depend on observations of the Earth, they are announced only months ahead and cannot be programmed in advance like leap years. Some companies have taken to 'smearing' the extra second, slowing their clocks slightly over a day, which means their systems briefly disagree with official time.",
      "In 2022 the body that oversees international measurement voted to stop adding leap seconds by 2035. The gap between atomic and solar time will then be allowed to grow, perhaps to a minute over a century, before any correction is made. Few people will notice, since the sun's position at noon already varies by far more than that across a single time zone. Astronomers and some systems that rely on the Earth's orientation will need adjustments, and a few critics regret cutting the last formal link between our clocks and the turning planet. For most users, though, the decision trades a symbolic connection for practical reliability.",
    ],
    questions: [
      q("main", "Which of the following best summarises the passage?", [1, 2, 3], [
        o("Atomic clocks are less reliable than the Earth's rotation.", "Paragraph 2 calls the Earth 'a poor timekeeper' by comparison.", "Distorts the passage"),
        o("The leap second, which keeps atomic and solar time together, is being dropped because it troubles computers, at the cost of a symbolic link.", "Covers why leap seconds exist, why they cause trouble and what their end means."),
        o("The Earth's rotation is slowing so fast that days will soon be noticeably longer.", "The changes are 'fractions of a millisecond'.", "Extreme wording"),
        o("Leap seconds and leap years exist for exactly the same reason.", "Leap years follow a fixed rule; leap seconds depend on observation.", "Distorts the passage"),
      ]),
      q("detail", "According to the passage, leap seconds cannot be programmed in advance like leap years because:", [2], [
        o("caesium atoms vibrate irregularly", "Caesium atoms are 'far steadier than the planet's spin'.", "Distorts the passage"),
        o("computers cannot handle a minute with sixty-one seconds", "That is why leap seconds are a nuisance, not why they cannot be scheduled.", "True but not the answer"),
        o("they depend on observations of the Earth and are announced only months ahead", "Paragraph 3 says exactly this."),
        o("the body that oversees measurement refuses to publish a schedule", "No refusal is mentioned.", "Out of scope"),
      ]),
      q("inference", "The author mentions that the sun's position at noon varies across a time zone in order to:", [3], [
        o("argue that time zones should be abolished", "No such proposal is made.", "Out of scope"),
        o("prove that solar time is more accurate than atomic time", "The point is about noticing a gap, not accuracy.", "Distorts the passage"),
        o("explain why astronomers oppose the decision", "Astronomers are said to need adjustments, not to be convinced by this point.", "Distorts the passage"),
        o("show that a gap of a minute or so will make little practical difference to most people", "People already live with a larger gap within one time zone, so 'few people will notice'."),
      ]),
      q("tone", "Which of the following best describes the author's view of the 2022 decision?", [3], [
        o("It is a sensible trade of a symbolic link for reliability, though not without costs.", "The last paragraph weighs adjustments and regrets against practical reliability."),
        o("It is a reckless choice that will throw navigation into chaos.", "Only 'some systems' need adjustments.", "Extreme wording"),
        o("It is pointless, because leap seconds never caused any problems.", "Paragraph 3 describes real problems.", "Distorts the passage"),
        o("It was forced on scientists by large technology companies.", "Nothing is said about who pushed for it.", "Out of scope"),
      ]),
    ],
    recall: [
      recall("Since 1967, the second has been defined by:", ["The Earth's rotation", "Vibrations of caesium atoms", "The movement of the moon", "The swing of a pendulum"], 1),
      recall("By when did the 2022 vote say leap seconds should stop?", ["2025", "2030", "2035", "2050"], 2),
    ],
  },
  {
    id: "sci-dinobirds",
    title: "The dinosaurs that never died",
    genre: "science",
    difficulty: "easy",
    since: "2026-10-18",
    paras: [
      "In 1861, just two years after Charles Darwin published On the Origin of Species, quarry workers in Bavaria found a fossil that seemed made to order for his theory. Archaeopteryx had feathers and wings like a bird, but also teeth, clawed fingers and a long bony tail like a small reptile. Only a dozen or so specimens have been found since, each treated as a treasure. It looked like a creature caught halfway between two groups, and it set off a debate about where birds came from that lasted for more than a century.",
      "For much of the twentieth century, many scientists doubted that birds descended from dinosaurs. One problem was the wishbone, the fused collarbones found in birds, which dinosaurs were thought to lack. Another was the general picture of dinosaurs as slow, cold-blooded giants, very unlike any bird. Some argued that the resemblances between birds and dinosaurs were coincidences, the result of similar ways of life rather than shared ancestry. Both objections weakened as discoveries piled up: wishbones turned up in many meat-eating dinosaurs, and studies of dinosaur bones suggested fast growth and active lives.",
      "The decisive evidence came from north-eastern China in the 1990s. Fine-grained rocks there, formed from volcanic ash settling in lakes, preserved soft tissue in extraordinary detail, and they revealed dozens of small dinosaurs covered in feathers. Some had simple filaments, like down; others had fully formed feathers on their arms and legs, though they could not have flown. One small dinosaur, Microraptor, had long feathers on all four limbs. Feathers, it became clear, had first evolved for other purposes, such as warmth or display, and were only later put to use in flight.",
      "Today most palaeontologists regard birds not merely as descendants of dinosaurs but as dinosaurs themselves, the one branch that survived the asteroid impact sixty-six million years ago. That changes how we should picture the extinction. It did not end the dinosaurs; it ended most of them. Why birds survived when their relatives did not is still debated; their small size, and a diet of seeds that could last through the dark years after the impact, may have helped. The roughly ten thousand species of birds alive today, from sparrows to ostriches, make dinosaurs one of the most successful groups of land animals on the planet.",
    ],
    questions: [
      q("main", "Which of the following best states the main idea of the passage?", [2, 3], [
        o("Archaeopteryx is the direct ancestor of all modern birds.", "The passage presents it as a transitional form, not a proven ancestor.", "Distorts the passage"),
        o("Dinosaurs were slow, cold-blooded giants.", "That old picture weakened as evidence piled up.", "Distorts the passage"),
        o("Fossil evidence, above all the feathered dinosaurs of China, has shown that birds are living dinosaurs.", "Covers the old debate, the decisive evidence and the conclusion."),
        o("Feathers evolved so that dinosaurs could fly.", "They first evolved for other purposes.", "Distorts the passage"),
      ]),
      q("detail", "The wishbone was an obstacle to the idea that birds came from dinosaurs because:", [1], [
        o("dinosaurs were thought not to have one", "Paragraph 2 says exactly this."),
        o("birds were thought not to have one", "Birds have wishbones; dinosaurs were thought to lack them.", "Distorts the passage"),
        o("it was found only in Archaeopteryx", "Nothing of the kind is said.", "Out of scope"),
        o("it showed that dinosaurs could fly", "Flight is not linked to the wishbone in the passage.", "Out of scope"),
      ]),
      q("inference", "Feathered Chinese dinosaurs that could not fly suggest that:", [2], [
        o("they had lost the ability to fly", "Nothing suggests their ancestors flew.", "Out of scope"),
        o("feathers were of no use to them", "Feathers served warmth or display.", "Distorts the passage"),
        o("the fossils were forgeries", "The fossils are treated as genuine.", "Out of scope"),
        o("feathers existed before flight and first served other purposes", "Paragraph 3 draws exactly this conclusion."),
      ]),
      q("structure", "The statement that the extinction 'did not end the dinosaurs; it ended most of them' depends on the idea that:", [3], [
        o("some large dinosaurs survived the asteroid", "Only birds survived.", "Distorts the passage"),
        o("birds are themselves dinosaurs", "If birds are dinosaurs, dinosaurs survive in them."),
        o("the asteroid never struck", "The passage says it did.", "Distorts the passage"),
        o("birds first appeared after the extinction", "Birds were the branch that survived it, so they existed before.", "Distorts the passage"),
      ]),
    ],
    recall: [
      recall("Where was Archaeopteryx found?", ["Bavaria", "China", "Montana", "Patagonia"], 0),
      recall("About how many species of birds are alive today?", ["One thousand", "Ten thousand", "One hundred thousand", "One million"], 1),
    ],
  },
  {
    id: "sci-ozone",
    title: "The hole that is closing",
    genre: "science",
    difficulty: "medium",
    since: "2026-10-18",
    paras: [
      "In 1985 three British scientists reported that the ozone layer over Antarctica was thinning dramatically each spring. Ozone high in the atmosphere absorbs most of the sun's ultraviolet radiation, which damages DNA and causes skin cancer and cataracts. The cause was soon traced to chlorofluorocarbons, or CFCs, gases used in refrigerators, aerosol sprays and foam. Stable and harmless at ground level, CFCs drift into the stratosphere, where ultraviolet light breaks them apart and releases chlorine that destroys ozone.",
      "The response was unusually fast. In 1987, only two years after the discovery was published, governments agreed the Montreal Protocol, which set out to phase out CFCs and related chemicals. The treaty was strengthened several times as the science improved, and it became the first in the history of the United Nations to be ratified by every member state. Production of the most damaging chemicals fell by more than ninety-nine per cent. Some of the substitutes adopted later turned out to warm the climate, and in 2016 the treaty was amended once more to cut them too.",
      "Several features made success possible. A handful of large companies produced most CFCs, so the problem had few owners. Substitutes were available, and once the leading manufacturer accepted that a ban was coming, it had an interest in selling them. The treaty also gave poorer countries extra time and money to switch. Above all, the danger was easy to picture: a hole in the sky and a rise in skin cancer were more vivid than the slow, diffuse harms that make other environmental problems hard to act on.",
      "The ozone layer is now recovering, though slowly, because CFCs linger in the atmosphere for decades; scientists expect the Antarctic hole to close around the 2060s. In the 2010s scientists detected a rise in new CFC emissions, traced it to factories in eastern China, and saw it fall once the source was found. The protocol had a bonus few anticipated: since CFCs are also powerful greenhouse gases, phasing them out has done more to slow warming than many treaties designed for that purpose. It is often held up as a model for climate action, though the comparison has limits, since carbon dioxide comes from almost every part of the economy rather than from a few factories.",
    ],
    questions: [
      q("main", "Which of the following best summarises the passage?", [1, 2, 3], [
        o("CFCs were harmless chemicals banned by mistake.", "They release chlorine that destroys ozone.", "Distorts the passage"),
        o("The ozone hole has already closed completely.", "It is expected to close around the 2060s.", "Distorts the passage"),
        o("Climate change can be solved in exactly the way the ozone problem was.", "The author says the comparison has limits.", "Extreme wording"),
        o("The ozone threat was met by a fast, effective treaty, helped by features that may not carry over to climate change.", "Covers the problem, the treaty, why it worked and its limits as a model."),
      ]),
      q("detail", "According to the passage, CFCs damage the ozone layer because:", [0], [
        o("they are poisonous at ground level", "They are 'stable and harmless at ground level'.", "Distorts the passage"),
        o("ultraviolet light breaks them apart high in the atmosphere, releasing chlorine", "Paragraph 1 describes exactly this."),
        o("they trap heat in the stratosphere", "Their warming effect is a separate point, not how they harm ozone.", "Distorts the passage"),
        o("they react with carbon dioxide", "Carbon dioxide is not part of the mechanism.", "Out of scope"),
      ]),
      q("except", "All of the following are given as reasons the Montreal Protocol succeeded EXCEPT:", [2], [
        o("every country could replace CFCs cheaply without any help", "The treaty gave poorer countries extra time and money, so this contradicts the passage."),
        o("a small number of companies produced most CFCs", "Named in paragraph 3.", "True but not the answer"),
        o("substitutes were available", "Named in paragraph 3.", "True but not the answer"),
        o("the danger was easy to picture", "Named in paragraph 3.", "True but not the answer"),
      ]),
      q("inference", "The author would most likely agree that the main obstacle to using the protocol as a model for climate action is that:", [3], [
        o("no substitutes exist for any greenhouse gas", "The passage says nothing of the kind.", "Extreme wording"),
        o("climate scientists are less reliable than ozone scientists", "No comparison of scientists is made.", "Out of scope"),
        o("carbon dioxide comes from almost every part of the economy, not from a few producers", "The last sentence gives this as the limit of the comparison."),
        o("poorer countries refuse all help", "Help for poorer countries was part of the protocol's success.", "Out of scope"),
      ]),
    ],
    recall: [
      recall("Over which continent was the ozone hole found?", ["Africa", "Antarctica", "Asia", "Australia"], 1),
      recall("In which year was the Montreal Protocol agreed?", ["1975", "1987", "1997", "2016"], 1),
    ],
  },
];
