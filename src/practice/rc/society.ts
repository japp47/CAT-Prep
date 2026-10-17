import type { RcSet } from "../types";
import { o, q, recall } from "./author";

export const SOCIETY: RcSet[] = [
  {
    id: "soc-algorithms",
    title: "The myth of the neutral algorithm",
    genre: "society",
    difficulty: "medium",
    paras: [
      "When a bank uses software to decide who gets a loan, or a city uses it to decide where to send police, the decision is often defended as objective. A machine, the argument goes, has no prejudices. It applies the same rules to everyone, unlike a human officer who may be tired, hurried or biased. This defence contains a truth and hides a confusion.",
      "The truth is that consistency is valuable. Human judges, interviewers and loan officers are notoriously inconsistent; the same application can receive different decisions depending on the time of day or the order in which it was read. A rule applied the same way every time removes that noise. The confusion lies in treating consistency as if it were fairness. A rule can be applied with perfect consistency and still be unfair, if the rule itself was badly made.",
      "Many modern systems are not given rules at all but learn them from past data. A model trained on a decade of a firm's hiring decisions will learn to predict whom the firm hired, which is not the same as learning whom the firm should have hired. If past decisions favoured candidates from certain universities or neighbourhoods, the model will reproduce the pattern, and may do so even if it is never told a candidate's background, because other details stand in for it. A postcode can carry information about income and ethnicity; a gap in employment can carry information about childcare.",
      "Making such systems fairer is not simply a matter of removing bias, because fairness itself has competing definitions. One might require that a lending model approve the same proportion of applicants from each group, or that it be equally accurate for each group, or that applicants with the same score have the same chance of repaying. Researchers have shown that, except in unusual circumstances, these conditions cannot all be met at once. Choosing among them is a question of values, not of mathematics.",
      "The useful lesson is not that algorithms should be abandoned; human judgment has the same problems, only less visibly. It is that every automated decision embodies choices made by people, about what data to use, what to predict and what counts as success. Calling the result neutral does not remove those choices. It only hides them from the people they affect.",
    ],
    questions: [
      q("main", "Which of the following best summarises the passage?", [1, 4], [
        o("Algorithms should replace human decision-makers because they are free of prejudice.", "The passage calls this defence a confusion.", "Distorts the passage"),
        o("Algorithms are more biased than human judges and should be abandoned.", "Paragraph 5: 'not that algorithms should be abandoned'.", "Distorts the passage"),
        o("Automated decisions can be more consistent than human ones, but they are not neutral, because they embody human choices about data and fairness.", "This keeps both halves: the truth about consistency (paragraph 2) and the hidden choices (paragraphs 3 to 5)."),
        o("Hiring models trained on past data always make accurate predictions.", "Accuracy is not the issue raised, and 'always' is unsupported.", "Extreme wording"),
      ]),
      q("inference", "According to the passage, a model may reproduce bias even when it is not told a candidate's background because:", [2], [
        o("other information in the data, such as a postcode, can act as a substitute for background", "Paragraph 3: 'other details stand in for it'."),
        o("its programmers instruct it to favour certain universities", "The bias comes from past decisions, not instructions.", "Distorts the passage"),
        o("human reviewers change its decisions afterwards", "No human review stage is described.", "Out of scope"),
        o("it cannot learn anything from past data", "It learns past patterns all too well.", "Distorts the passage"),
      ]),
      q("detail", "The fourth paragraph suggests that choosing a definition of fairness:", [3], [
        o("is a technical problem that researchers have now solved", "Researchers showed the definitions conflict; nothing was solved.", "Distorts the passage"),
        o("is unnecessary if a model is accurate", "Equal accuracy is only one of the competing definitions.", "Distorts the passage"),
        o("means approving the same proportion of applicants from each group", "That is one definition among three.", "Too narrow or too broad"),
        o("involves trade-offs that mathematics alone cannot settle", "The definitions cannot all be met, so choosing among them 'is a question of values, not of mathematics'."),
      ]),
      q("application", "Which of the following would the author most likely regard as consistency mistaken for fairness?", [1], [
        o("A loan officer approves similar applications differently depending on her mood.", "This is inconsistency, the problem the author grants that rules solve.", "Distorts the passage"),
        o("A college admits students strictly by a test score known to favour those who could afford private coaching, and calls this fair because every applicant is treated alike.", "The rule is applied consistently, but the rule itself is unfair: the confusion described in paragraph 2."),
        o("A company stops using a hiring model after finding that it penalised women.", "This corrects a problem rather than illustrating the confusion.", "Out of scope"),
        o("A city decides that every neighbourhood will receive the same number of police patrols.", "Nothing here suggests the rule was badly made.", "Out of scope"),
      ]),
    ],
    recall: [
      recall("What does consistency remove from decisions, according to the author?", ["Bias", "Noise", "Fairness", "Choice"], 1),
      recall("What can a gap in employment carry information about?", ["Income", "Ethnicity", "Education", "Childcare"], 3),
    ],
  },
  {
    id: "soc-remote",
    title: "Work from anywhere",
    genre: "society",
    difficulty: "easy",
    paras: [
      "For most of history, where you lived largely decided the work you could do. The pandemic briefly loosened that link. Millions of office workers discovered that much of their job could be done from a spare room, and some never went back. The shift has prompted predictions that remote work will spread opportunity away from expensive cities, letting a programmer in a small town earn a big-city salary while paying a small-town rent.",
      "There is something to the prediction. Surveys in several countries show that people who can work remotely value the option highly, some saying they would accept a pay cut to keep it. Firms that allow it can recruit from a much larger pool, and workers with disabilities or caring responsibilities, for whom a daily commute was a barrier, have gained access to jobs that were previously closed to them.",
      "But the opportunity is unevenly distributed. Remote work is possible mainly in jobs done at a desk, which tend to be better paid and to require degrees. Nurses, bus drivers, cooks and factory workers cannot do their work from home. In many countries fewer than half of all jobs can be done remotely even in principle, so a revolution in where people work affects a minority of workers, and a relatively privileged one.",
      "There are also signs that distance has costs that do not show up at once. Junior employees learn much of their job by watching and overhearing colleagues, and some studies suggest that those working remotely receive less feedback and are promoted more slowly. Firms that have called staff back to the office often cite collaboration and training, though critics suspect that a desire for control plays a part as well.",
      "The likely outcome is neither the death of the office nor a return to the old routine but a mixture, with many workers spending part of the week at home. Whether that mixture spreads opportunity or concentrates it will depend less on technology than on choices about who gets to work flexibly, how new staff are trained and whether small towns have the broadband and services that remote workers need.",
    ],
    questions: [
      q("main", "Which of the following best states the main idea of the passage?", [1, 2, 3, 4], [
        o("Remote work will end the need for offices.", "Paragraph 5 rejects 'the death of the office'.", "Extreme wording"),
        o("Remote work mainly benefits nurses and factory workers.", "These are named as workers who cannot work from home.", "Distorts the passage"),
        o("Firms call staff back to offices only because they want control.", "Firms cite collaboration and training; control is only what critics suspect.", "Half right, half wrong"),
        o("Remote work brings real benefits, but they are unevenly shared and carry hidden costs, so its effect on opportunity is uncertain.", "Paragraph 2 gives the benefits, paragraphs 3 and 4 the limits and costs, and paragraph 5 the open outcome."),
      ]),
      q("detail", "According to the passage, which group has gained access to jobs through remote work?", [1], [
        o("Workers for whom a daily commute was a barrier, such as some people with disabilities", "Stated in paragraph 2."),
        o("Bus drivers and cooks", "They cannot work from home.", "Distorts the passage"),
        o("Workers without degrees in rural areas", "Remote jobs tend to require degrees.", "Distorts the passage"),
        o("Junior employees hoping for faster promotion", "Remote junior staff may be promoted more slowly.", "Distorts the passage"),
      ]),
      q("inference", "The author regards the prediction in the first paragraph as:", [1, 2], [
        o("entirely mistaken", "Paragraph 2 begins 'There is something to the prediction'.", "Extreme wording"),
        o("proven by surveys", "Surveys show workers value remote work, not that opportunity has spread.", "Distorts the passage"),
        o("partly justified but overstated", "The author grants real gains (paragraph 2) and then limits them (paragraphs 3 and 4)."),
        o("irrelevant to small towns", "Small towns are central to both the prediction and the conclusion.", "Out of scope"),
      ]),
      q("structure", "The fourth paragraph serves to:", [3], [
        o("explain why most jobs cannot be done remotely", "That is paragraph 3.", "Distorts the passage"),
        o("argue that firms should ban remote work", "No such recommendation is made.", "Out of scope"),
        o("show that remote workers are paid less", "Pay levels are not discussed there.", "Out of scope"),
        o("point out drawbacks of remote work that are less obvious", "It describes 'costs that do not show up at once': less feedback and slower promotion."),
      ]),
    ],
    recall: [
      recall("In many countries, what share of jobs can be done remotely even in principle?", ["Nearly all", "About three quarters", "Fewer than half", "Fewer than a tenth"], 2),
      recall("What do some studies suggest about junior employees working remotely?", ["They are paid more", "They receive less feedback and are promoted more slowly", "They change jobs more often", "They work longer hours"], 1),
    ],
  },
  {
    id: "soc-repair",
    title: "Why we stopped repairing things",
    genre: "society",
    difficulty: "medium",
    paras: [
      "A generation ago a broken radio went to a repair shop. Today a broken phone, kettle or printer is more often thrown away. The change is familiar to anyone over forty, and it is often lamented. It is tempting to explain this by a decline in values, a culture that prefers novelty to care. The economics of repair offers a less moralising account.",
      "Manufactured goods have become cheap because factories are efficient, while repair has stayed expensive because it is labour. A technician's hour cannot be automated the way a production line can, so as wages rise relative to the price of goods, mending an object costs more relative to replacing it. Economists see the same pattern in many services, from haircuts to live music, where productivity grows slowly and costs therefore rise. A repair bill that was once a fraction of the price of a new appliance can now exceed it.",
      "Design has added to the problem. Components that were once screwed together are now glued; batteries are sealed in; parts are made specially for each model and sold only to authorised technicians, if at all. Even a simple job such as replacing a cracked screen may need special tools that the public cannot buy. Some manufacturers argue that these choices make devices thinner, more waterproof and safer. Critics reply that they also make independent repair impossible and steer customers back to the manufacturer or the shop.",
      "The 'right to repair' movement aims to change this. In several places laws now require manufacturers to make spare parts and repair manuals available for a number of years, and some require that batteries be replaceable by users. Supporters point to the environmental cost of waste, especially electronic waste, which contains both valuable metals and toxic substances, and to the local jobs that a repair trade supports.",
      "Laws alone are unlikely to bring back the corner repair shop if a new kettle remains cheaper than an hour of a technician's time. Their more realistic aim is to stop design from making repair harder than the economics already does, and to give people a choice. A culture of repair, if it returns, will be built on that choice rather than on nostalgia.",
    ],
    questions: [
      q("main", "Which of the following best states the main idea of the passage?", [0, 1, 2, 4], [
        o("People throw things away because they now value novelty more than care.", "The author sets this explanation aside in favour of economics.", "Distorts the passage"),
        o("Right-to-repair laws will bring back the corner repair shop.", "Paragraph 5 says laws alone are unlikely to do this.", "Extreme wording"),
        o("Electronic waste contains valuable metals and toxic substances.", "A detail from paragraph 4, not the main idea.", "Too narrow or too broad"),
        o("The decline of repair is better explained by economics and product design than by changing values, and laws can widen people's ability to repair.", "Paragraph 1 rejects the values account, paragraphs 2 and 3 give economics and design, and paragraphs 4 and 5 the role of law."),
      ]),
      q("inference", "The comparison with haircuts and live music suggests that:", [1], [
        o("haircuts and live music are becoming less popular", "Their popularity is not discussed.", "Out of scope"),
        o("services that depend on human labour tend to grow more expensive relative to manufactured goods", "Like repair, they are labour whose productivity grows slowly, so their relative cost rises."),
        o("repair technicians are paid more than barbers", "No pay comparison is made.", "Out of scope"),
        o("the price of manufactured goods rises along with wages", "Manufactured goods have become cheaper.", "Distorts the passage"),
      ]),
      q("except", "Which of the following is NOT given in the passage as a design choice that makes repair harder?", [2], [
        o("Gluing components together", "Named in paragraph 3.", "True but not the answer"),
        o("Sealing batteries inside devices", "Named in paragraph 3.", "True but not the answer"),
        o("Selling parts only to authorised technicians", "Named in paragraph 3.", "True but not the answer"),
        o("Using fewer, standard parts across many models", "The passage describes the opposite: parts made specially for each model."),
      ]),
      q("tone", "The author's view of the right-to-repair movement is best described as:", [4], [
        o("supportive, but realistic about what laws can achieve", "Paragraph 5 sees a 'more realistic aim' for the laws: stopping design from making repair harder and giving people a choice."),
        o("dismissive, since economics makes repair pointless", "The author sees value in giving people a choice.", "Distorts the passage"),
        o("nostalgic for the repair shops of the past", "The author says a repair culture must be built 'on that choice rather than on nostalgia'.", "Distorts the passage"),
        o("unreservedly enthusiastic about its prospects", "The author doubts laws can revive the corner shop.", "Extreme wording"),
      ]),
    ],
    recall: [
      recall("Why has repair stayed expensive, according to the passage?", ["It is labour that cannot be automated", "Spare parts are scarce", "Repair shops are taxed heavily", "Customers demand guarantees"], 0),
      recall("What do some laws require of batteries?", ["That they last ten years", "That users can replace them", "That they be recycled by the shop", "That they be made locally"], 1),
    ],
  },
  {
    id: "soc-cash",
    title: "Just give them money?",
    genre: "society",
    difficulty: "easy",
    paras: [
      "For much of the history of aid, the idea of simply handing money to poor people was treated with suspicion. Donors worried that cash would be spent on alcohol or tobacco, or that it would make people less willing to work. Behind these worries lay an assumption, rarely stated, that poverty reflects poor judgement as much as a lack of money. Aid therefore usually arrived in kind, as food, livestock, training or buildings chosen by outsiders who believed they knew what the poor needed.",
      "Over the past two decades, a series of careful studies has tested these worries, helped by mobile-phone payments that made it cheap to send money even to remote villages. In programmes in Kenya, Mexico, Malawi and elsewhere, researchers compared households that received cash with similar households that did not, often choosing recipients by lottery so that the two groups differed only in the transfer. Spending on alcohol and tobacco did not rise, and in several studies it fell. Recipients bought livestock, repaired roofs, paid school fees and started small businesses, and there was little sign that they stopped working.",
      "These results have made cash a benchmark. Some aid organisations now ask of every programme whether it does more good than simply giving its budget to the people it is meant to help. That is a demanding test, and few traditional programmes had ever been asked to pass it. A training scheme that costs as much per person as a year's income, for example, must show that it raises earnings by more than the money itself would have done.",
      "Cash is not a cure-all. It cannot build a road, staff a clinic or stop an epidemic, and its benefits depend on there being things to buy; in a remote village with a single shop, a sudden flow of money may simply push up prices. Nor can it fix problems that are not about money at all, such as discrimination or insecurity. Some studies also found that early gains faded after a few years. But the evidence has shifted the burden of proof. Programmes that decide on behalf of the poor what they should have now need to explain why the poor could not have chosen better themselves.",
    ],
    questions: [
      q("main", "Which of the following best states the main point of the passage?", [1, 2, 3], [
        o("Aid in kind is always wasteful and should be abolished.", "The author lists things only non-cash aid can do.", "Extreme wording"),
        o("Evidence that cash is well spent has made it a benchmark for aid, though it cannot replace every other kind of help.", "Covers the old worry, the evidence, the benchmark and the limits."),
        o("Poor households in Kenya spend most of their money on livestock.", "Livestock is one of several purchases, across several countries.", "Too narrow or too broad"),
        o("Cash transfers have ended poverty for good wherever they were tried.", "Some gains 'faded after a few years'.", "Distorts the passage"),
      ]),
      q("detail", "Recipients in the studies were often chosen by lottery in order to:", [1], [
        o("make sure the two groups differed only in whether they received cash", "Paragraph 2 says this is why lotteries were used."),
        o("give the money to the poorest households first", "A lottery does not pick the poorest.", "Distorts the passage"),
        o("reduce the cost of the programmes", "Cost is not mentioned as a reason.", "Out of scope"),
        o("stop recipients from spending on alcohol", "A lottery decides who receives cash, not how it is spent.", "Distorts the passage"),
      ]),
      q("application", "Which programme would pass the 'demanding test' described in the third paragraph?", [2], [
        o("A scheme costing a year's income per person that raises earnings by less than that amount", "It does less good than handing over its budget, so it fails the test.", "Distorts the passage"),
        o("A programme that buys livestock for every household, whether they want it or not", "The test compares results with cash; this describes deciding for people.", "Out of scope"),
        o("A clinic in a remote village", "Cash cannot staff a clinic, but the passage does not apply the test to one.", "True but not the answer"),
        o("A training course that raises earnings by more than its cost per person would have done if paid as cash", "This is exactly the comparison the test demands."),
      ]),
      q("inference", "The final sentence of the passage implies that:", [3], [
        o("the poor always make better choices than aid agencies", "The sentence shifts the burden of proof; it does not say 'always'.", "Extreme wording"),
        o("aid in kind has been proved harmful", "It has to justify itself, not that it is harmful.", "Distorts the passage"),
        o("programmes that give goods or services must now justify themselves against letting people choose", "They 'now need to explain why the poor could not have chosen better themselves'."),
        o("donors should stop funding research on aid", "The passage relies on such research.", "Out of scope"),
      ]),
    ],
    recall: [
      recall("What did donors worry cash would be spent on?", ["Alcohol and tobacco", "School fees", "Livestock", "Roof repairs"], 0),
      recall("Which of these does the passage say cash cannot do?", ["Pay school fees", "Build a road", "Buy livestock", "Start a business"], 1),
    ],
  },
  {
    id: "soc-streets",
    title: "Eyes on the street",
    genre: "society",
    difficulty: "medium",
    since: "2026-10-18",
    paras: [
      "In 1961 the writer and activist Jane Jacobs published a book that attacked the planners then rebuilding American cities. Their ideal was order: homes in one zone, offices in another, shops in a third, with wide roads and open lawns between towers. Many of the neighbourhoods Jacobs defended were labelled slums and marked for clearance. Jacobs, who lived on a busy street in Greenwich Village, argued that the planners' tidy vision destroyed the very things that made cities work.",
      "Her central observation was about safety. A street feels safe, she wrote, not because of police patrols or walls but because people are using it at all hours and watching it, often without meaning to. Shopkeepers, residents at their windows, people heading to work or out for the evening: these 'eyes on the street' notice trouble and, by being there, discourage it. A street with a mix of homes, shops, workplaces and bars has people on it from morning to night; a street of offices alone is busy at noon and empty, and so more threatening, after dark.",
      "Many of her ideas have since become orthodox. Planners now speak of mixed use and short blocks, and cities from Copenhagen to Bogotá have narrowed roads to give space back to walking. Some research supports her intuition about watchfulness, finding that busy, mixed streets have fewer street robberies. Yet the evidence is not simple: a crowd can shelter pickpockets as well as deter muggers, and the same busy bar that keeps a street lively at night may also be the source of its fights.",
      "A sharper criticism concerns who benefits. The lively neighbourhoods Jacobs admired have become some of the most expensive places to live, and the residents who once supplied the 'eyes' have often been priced out. Jacobs saw a diversity of people and uses as a city's strength, but she offered few tools for protecting it once a neighbourhood became fashionable. Her defenders reply that a book written to stop bulldozers cannot be blamed for a housing market it did not foresee. Both sides agree on one thing: a street is not just a channel for traffic but a place where people keep an eye on each other.",
    ],
    questions: [
      q("main", "Which of the following best captures the main point of the passage?", [1, 2, 3], [
        o("Cities should separate homes, offices and shops into their own zones.", "That is the planners' ideal Jacobs attacked.", "Distorts the passage"),
        o("Police patrols are the main reason streets feel safe.", "Jacobs says safety comes from people using and watching the street, not patrols.", "Distorts the passage"),
        o("Jane Jacobs single-handedly stopped the rebuilding of American cities.", "Nothing claims she stopped it alone.", "Extreme wording"),
        o("Jacobs's idea that busy, mixed streets keep people safe has been influential, though the evidence is mixed and such neighbourhoods face new problems.", "Covers the idea, its influence, the mixed evidence and the criticism about cost."),
      ]),
      q("inference", "By Jacobs's reasoning, a street lined only with offices would be:", [1], [
        o("safer at night, since fewer people are about to cause trouble", "She argues the opposite: emptiness makes a street threatening.", "Distorts the passage"),
        o("busy at all hours", "It is 'busy at noon and empty' after dark.", "Distorts the passage"),
        o("less safe after dark, because no one is there to watch it", "Paragraph 2 says such a street is 'more threatening, after dark'."),
        o("the ideal design for a modern city", "This is the planners' view, not hers.", "Distorts the passage"),
      ]),
      q("except", "The passage mentions all of the following as complications for Jacobs's ideas EXCEPT:", [2, 3], [
        o("crowds can shelter pickpockets", "Named in paragraph 3.", "True but not the answer"),
        o("short blocks make streets harder to police", "Short blocks are mentioned only as an idea planners adopted, not as a problem."),
        o("a busy bar may also be the source of fights", "Named in paragraph 3.", "True but not the answer"),
        o("lively neighbourhoods become expensive and push residents out", "Named in paragraph 4.", "True but not the answer"),
      ]),
      q("tone", "The author's attitude towards Jacobs is best described as:", [2, 3], [
        o("appreciative, but aware of the limits of her ideas", "The author credits her influence while reporting mixed evidence and fair criticism."),
        o("dismissive of her as an amateur", "Her ideas are said to have become orthodox.", "Distorts the passage"),
        o("uncritical admiration", "The author gives space to criticisms.", "Extreme wording"),
        o("indifferent, since her ideas are now outdated", "The closing sentence affirms her central point.", "Distorts the passage"),
      ]),
    ],
    recall: [
      recall("In which year did Jacobs publish her book?", ["1951", "1961", "1971", "1981"], 1),
      recall("What phrase does the passage use for people who watch a street?", ["Eyes on the street", "Neighbourhood watch", "Street guardians", "Public eyes"], 0),
    ],
  },
  {
    id: "soc-corrections",
    title: "Do corrections backfire?",
    genre: "society",
    difficulty: "hard",
    since: "2026-10-18",
    paras: [
      "In 2010 two political scientists reported a troubling result. When people who held a false belief were shown a correction, some of them held the belief more firmly than before. The finding, soon called the backfire effect, seemed to explain a great deal about politics and the internet: facts, it appeared, could not only fail to persuade but actively entrench error. Journalists and fact-checkers began to wonder whether their work was doing more harm than good.",
      "Later research was more reassuring. Large studies across many topics, including some by the original authors, found that the backfire effect was rare and hard to reproduce. One widely cited study, testing dozens of claims on thousands of participants, found almost no instances of it. In most cases, people shown a correction moved, at least somewhat, towards the accurate view, even when the correction cut against their political loyalties. The earlier result may have reflected particular questions, small samples, or the noise that appears when many effects are tested and only the striking ones are reported.",
      "That corrections work does not mean they work well. Their effects are often modest and fade within weeks, while the original falsehood, repeated often enough, can feel familiar and therefore true. People may also accept a correction of a specific claim while keeping the broader attitude it supported, much as one might concede that a particular statistic was wrong without changing one's mind about the policy it was used to defend.",
      "Some researchers have therefore turned from correcting to 'prebunking'. Rather than chasing each false claim, they teach people in advance to recognise the techniques common to many of them, such as false dilemmas, emotional language or fake experts. Short games and videos built on this idea, sometimes compared to a vaccine that exposes people to a weakened dose of manipulation, have produced measurable improvements in people's ability to spot misleading posts. Whether such training lasts, or reaches the people most exposed to falsehoods, is still an open question. But the shift reflects a sober conclusion from the backfire debate: the problem was never that facts are useless, only that a single correction is a weak tool against a story told a thousand times.",
    ],
    questions: [
      q("main", "Which of the following best summarises the passage?", [1, 2, 3], [
        o("Correcting a false belief usually makes people hold it more firmly.", "Later research found backfire rare.", "Distorts the passage"),
        o("Fact-checking is useless and should be abandoned.", "The author says facts are not useless.", "Extreme wording"),
        o("Corrections rarely backfire, but their modest, fading effects have led researchers to teach people to spot manipulation in advance.", "Covers the reassuring research, its limits and the turn to prebunking."),
        o("The political scientists invented the backfire effect.", "Their result is said to be hard to reproduce, not invented.", "Distorts the passage"),
      ]),
      q("strengthen", "Which finding would most support the explanation offered at the end of the second paragraph for the 2010 result?", [1], [
        o("In the large studies, corrections moved people towards accuracy.", "This shows backfire is rare but does not explain why the first study found it.", "True but not the answer"),
        o("Repeating the 2010 study with much larger samples and the same questions produced no backfire.", "It points to small samples, which is one of the explanations offered."),
        o("People forget corrections within a few weeks.", "This is about the limits of corrections, not the 2010 result.", "True but not the answer"),
        o("Prebunking games improve people's ability to spot misleading posts.", "It concerns a different approach altogether.", "Out of scope"),
      ]),
      q("inference", "The example of conceding a statistic while keeping a view on policy illustrates that:", [2], [
        o("people never change their minds", "They do change their minds on the specific claim.", "Extreme wording"),
        o("statistics in political debates are usually wrong", "The passage makes no such claim.", "Out of scope"),
        o("corrections always fade within weeks", "Fading is a separate point, and 'always' is too strong.", "Extreme wording"),
        o("a correction can succeed on its narrow point without changing the wider attitude", "This is exactly what the comparison describes."),
      ]),
      q("application", "Which of the following is an example of prebunking as the passage describes it?", [3], [
        o("A short online game that shows players how fake experts are used to make claims look credible", "It teaches a common technique in advance, before any particular false claim."),
        o("A newspaper article correcting a false statistic that a politician repeated", "This corrects one claim after the fact.", "Distorts the passage"),
        o("A vaccination campaign run by a health ministry", "The vaccine is only a comparison.", "Out of scope"),
        o("Repeating a false claim often so that people remember it", "That is how falsehoods spread, not how prebunking works.", "Distorts the passage"),
      ]),
    ],
    recall: [
      recall("In which year was the backfire effect first reported?", ["2000", "2010", "2016", "2020"], 1),
      recall("What is prebunking compared to?", ["A vaccine", "A firewall", "A filter", "A lie detector"], 0),
    ],
  },
];
