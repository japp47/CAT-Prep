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
];
