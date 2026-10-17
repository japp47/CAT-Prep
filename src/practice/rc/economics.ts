import type { RcSet } from "../types";
import { o, q, recall } from "./author";

export const ECONOMICS: RcSet[] = [
  {
    id: "econ-cities",
    title: "Why cities keep growing",
    genre: "economics",
    difficulty: "medium",
    paras: [
      "Economists have long been puzzled by the stubborn growth of large cities. Rents are higher, commutes are longer and congestion eats into every working day, yet people and firms keep arriving. If the costs of urban life are so visible, something less visible must be paying for them. The usual name for that something is agglomeration: the gains that arise simply because many productive people are close to one another.",
      "The gains take three broad forms. Firms that share a dense labour market can find specialised workers quickly, and workers can switch employers without moving house, which makes both sides more willing to invest in narrow skills. Suppliers cluster near their customers, so inputs become cheaper and more varied. And ideas travel faster when the people who hold them run into each other, whether in offices, cafés or the queue for a train. The last of these is the hardest to measure and, many economists suspect, the most important.",
      "Evidence for it comes from odd places. Studies of patents find that inventors cite work produced nearby far more often than distance alone would predict, even after allowing for the clustering of industries. Workers who move from small towns to large cities do not earn much more on arrival; instead their wages climb faster over time, as if the city were teaching them something. When they leave, much of the premium travels with them, which suggests that what they gained was skill rather than a local subsidy.",
      "None of this means that bigger is always better. Agglomeration gains appear to rise with city size at a diminishing rate, while the costs of housing and transport rise faster once land runs short. Where cities are allowed to build upward and outward, the balance can stay favourable for a long time. Where planning rules freeze the housing stock, the gains are captured by those who already own property, and newcomers are priced out of the very places that would have made them more productive.",
      "The policy lesson is therefore not to choose between cities and the countryside but to notice who is excluded from urban gains and why. A country that restricts building in its most productive cities is, in effect, taxing the learning of its young workers and handing the proceeds to landlords. That cost appears in no budget, which is precisely why it is so easy to ignore.",
    ],
    questions: [
      q("main", "Which of the following best captures the central argument of the passage?", [0, 3, 4], [
        o("Cities grow because firms prefer to locate near their suppliers, which lowers the cost of inputs.", "Supplier clustering is only one of three gains listed in paragraph 2. The passage's argument is wider.", "Too narrow or too broad"),
        o("Large cities persist despite their costs because closeness creates gains, especially in learning, which housing restrictions can deny to newcomers.", "This covers the puzzle (paragraph 1), the gains and the evidence for learning (paragraphs 2 and 3), and who loses out when building is restricted (paragraphs 4 and 5)."),
        o("Congestion and high rents show that most large cities have grown beyond their efficient size.", "The passage says the gains pay for these visible costs and that the balance can stay favourable. It never says cities are too big.", "Distorts the passage"),
        o("Governments should move investment from rural areas to cities to raise national productivity.", "The final paragraph explicitly says the lesson is not to choose between cities and the countryside.", "Out of scope"),
      ]),
      q("structure", "The author mentions that much of the wage premium 'travels with' workers who leave a city in order to:", [2], [
        o("show that city wages are inflated by a temporary local subsidy", "The author draws the opposite conclusion: the gain was skill rather than a local subsidy.", "Distorts the passage"),
        o("argue that workers should return to small towns once they have gained experience", "The passage gives no advice about where workers should go after gaining experience.", "Out of scope"),
        o("explain why firms in large cities struggle to keep specialised workers", "Retention by firms is never discussed.", "Out of scope"),
        o("suggest that workers in large cities acquire skills that remain valuable elsewhere", "If the premium stays with workers after they leave, what they gained was portable skill. This is exactly the inference the author draws."),
      ]),
      q("except", "According to the passage, each of the following is a source of agglomeration gains EXCEPT:", [1, 3], [
        o("a deep pool of specialised workers that firms can draw on", "Listed in paragraph 2 as the first form of gain.", "True but not the answer"),
        o("suppliers locating close to their customers", "Listed in paragraph 2 as the second form of gain.", "True but not the answer"),
        o("lower housing costs that let workers save more", "Housing in large cities is a cost, not a gain. Paragraphs 1 and 4 describe rents as higher and rising."),
        o("the faster spread of ideas among people who meet often", "Listed in paragraph 2 as the third, and perhaps most important, gain.", "True but not the answer"),
      ]),
      q("strengthen", "Which of the following, if true, would most weaken the claim that cities raise wages by teaching workers skills?", [2], [
        o("Firms in large cities spend more on formal training than firms in small towns.", "This would support the idea that workers learn in cities, not weaken it.", "Distorts the passage"),
        o("Rents in large cities have risen faster than wages over the last decade.", "Rents affect living costs, not whether workers acquire skills.", "Out of scope"),
        o("Workers who move to large cities and later leave earn no more in their new jobs than similar workers who never moved.", "The learning claim rests on the premium travelling with workers who leave. If it does not, the evidence for learning collapses."),
        o("Inventors in large cities file more patents than inventors in small towns.", "Patent numbers say nothing about how individual workers' wages grow.", "Out of scope"),
      ]),
    ],
    recall: [
      recall("What do studies of patents show, according to the passage?", ["Most patents come from the largest firms", "Inventors cite nearby work more often than distance alone would predict", "Patents are filed faster in small towns", "Inventors rarely cite work from other industries"], 1),
      recall("What happens where planning rules freeze the housing stock?", ["Cities grow upward instead of outward", "Wages in the city fall", "Existing property owners capture the gains and newcomers are priced out", "Firms move to the countryside"], 2),
    ],
  },
  {
    id: "econ-thrift",
    title: "The paradox of thrift",
    genre: "economics",
    difficulty: "medium",
    paras: [
      "Saving is a virtue in a household and, under certain conditions, a hazard in an economy. The reasoning behind this claim, usually called the paradox of thrift, begins with a simple accounting fact: one person's spending is another person's income. If a single family decides to spend less and save more, its savings rise and nobody else notices. If millions of families make the same decision at once, the shops they no longer visit sell less, lay off staff, and the incomes from which everyone was hoping to save begin to shrink.",
      "The paradox lies in the outcome. Each household acts sensibly, yet together they may end up saving no more than before, because the total that can be saved depends on the total that is earned. In the worst case the attempt to save more lowers income so much that total saving actually falls. What is prudent for each is self-defeating for all, an example of what logicians call the fallacy of composition: assuming that what holds for the parts must hold for the whole.",
      "Critics point out that the paradox depends on its setting. In an economy running at full capacity, extra saving frees resources for investment; banks lend the money to firms that build factories, and future output rises. The paradox bites only when that channel is blocked, when firms see weak demand and refuse to invest however cheap credit becomes. That is why the idea is associated with recessions, and why it was revived after the financial crisis of 2008, when households, firms and governments in many countries tried to cut their debts at the same time.",
      "The policy implication is uncomfortable for anyone raised on household common sense. If private spending collapses, a government that tightens its own belt in sympathy may deepen the slump it hopes to escape. Hence the argument that public spending should rise when private spending falls, and should be cut back when the economy recovers, so that the state leans against the cycle rather than with it.",
      "Whether governments actually behave this way is another matter. Spending that is easy to start in a downturn is often hard to stop in a boom, and borrowing that looks temporary has a habit of becoming permanent. The paradox of thrift explains why austerity can fail in a slump; it says much less about how to make sure that stimulus ends when the slump does.",
    ],
    questions: [
      q("main", "The passage is primarily concerned with:", [0, 1, 3], [
        o("arguing that households should save less during recessions", "The passage explains a collective outcome. It never advises individual households to change what they do.", "Distorts the passage"),
        o("describing the causes of the financial crisis of 2008", "2008 appears only as an example of when the idea was revived.", "Too narrow or too broad"),
        o("explaining how choices that are sensible for individuals can harm the economy as a whole, and what that means for policy", "Paragraphs 1 and 2 explain the paradox, paragraph 3 its limits, and paragraphs 4 and 5 the policy implications and their difficulties."),
        o("showing that government borrowing always becomes permanent", "The author says temporary borrowing 'has a habit' of becoming permanent, not that it always does.", "Extreme wording"),
      ]),
      q("inference", "It can be inferred from the passage that the paradox of thrift is least likely to apply when:", [2], [
        o("firms are eager to invest and banks readily lend out new savings", "Paragraph 3: with investment flowing, extra saving funds factories and raises future output, so the paradox does not bite."),
        o("households and governments try to cut their debts at the same time", "This is the 2008 situation, described as exactly when the paradox applies.", "Distorts the passage"),
        o("demand is weak and firms refuse to invest even though credit is cheap", "Paragraph 3 says this is precisely when the paradox bites.", "Distorts the passage"),
        o("private spending collapses and the government also cuts its spending", "Paragraph 4 says this deepens the slump. The paradox applies with full force.", "Distorts the passage"),
      ]),
      q("structure", "The author refers to the 'fallacy of composition' in order to:", [1], [
        o("suggest that households make irrational decisions about saving", "The passage stresses that each household acts sensibly.", "Distorts the passage"),
        o("name the logical error of assuming that what is true for each household is true for the economy as a whole", "That is the definition given: assuming what holds for the parts must hold for the whole."),
        o("show that logicians have disproved the paradox of thrift", "Logicians are mentioned only for the name of the error. Nothing is disproved.", "Out of scope"),
        o("argue that economics should rely on accounting facts rather than common sense", "The passage uses an accounting fact but makes no general claim about economic method.", "Too narrow or too broad"),
      ]),
      q("tone", "The author's attitude towards using public spending to counter a slump is best described as:", [3, 4], [
        o("enthusiastic, since it guarantees a quick recovery", "Nothing in the passage promises a guaranteed or quick recovery.", "Extreme wording"),
        o("dismissive, because household common sense is a better guide", "The author presents household common sense as misleading in a slump.", "Distorts the passage"),
        o("neutral, since the author takes no position on the question", "The final paragraph voices a clear doubt about whether governments will withdraw stimulus.", "Distorts the passage"),
        o("accepting of the reasoning behind it, but doubtful that governments will withdraw it on time", "Paragraph 4 sets out the reasoning without objection, and paragraph 5 questions whether stimulus will end when the slump does."),
      ]),
    ],
    recall: [
      recall("What accounting fact does the paradox begin with?", ["Savings always equal investment", "Governments spend more than households", "One person's spending is another person's income", "Prices rise when demand rises"], 2),
      recall("Which event, according to the passage, revived interest in the paradox?", ["The financial crisis of 2008", "The oil shock of the 1970s", "The Great Depression", "The pandemic of 2020"], 0),
    ],
  },
  {
    id: "econ-rules",
    title: "Rules or discretion",
    genre: "economics",
    difficulty: "hard",
    paras: [
      "For most of the twentieth century, the question of how central banks should set interest rates was answered by judgment. Officials looked at the data, consulted their instincts and moved rates as circumstances seemed to require. The case for discretion was obvious: economies are complicated, shocks are unpredictable, and no rule written in advance can anticipate everything a central banker will face.",
      "The case against discretion was subtler, and it took the inflation of the 1970s to make it persuasive. Suppose a central bank announces that it will keep inflation low. Workers and firms who believe the announcement set wages and prices accordingly. But once they have done so, the bank is tempted to break its word: a burst of unexpected inflation would, for a while, raise output and lower unemployment. People are not fools, and they anticipate the temptation. They build higher inflation into their contracts from the start, and the economy ends up with more inflation and no extra output. The problem is not that officials are ignorant or wicked but that their freedom to change course undermines the credibility of what they say.",
      "One response is to tie the bank's hands with a rule, such as a fixed formula linking interest rates to inflation and output. Another, which most countries eventually preferred, is to give the bank independence from elected governments, a clear inflation target and a duty to explain itself in public. Independence removes the most obvious source of temptation, the politician facing an election; transparency makes it costly for the bank to depart from its stated aims without good reason.",
      "Neither solution is perfect. A rigid rule may perform badly when the economy is hit by something its authors did not foresee, such as a pandemic that shuts down supply and demand at once. A framework of constrained discretion, meanwhile, depends on the reputation of the institution, and reputations take decades to build and months to lose. Some economists worry that the experiments of recent years, from very low interest rates to large purchases of government bonds, have blurred the line between monetary and fiscal policy and so revived the old temptations in a new form.",
      "What the debate has established is that credibility is an asset with real economic value. A central bank that is believed can achieve with a few words what an untrusted one could not achieve with large changes in interest rates. The real question is not whether to follow rules or use discretion, but how to make discretion believable.",
    ],
    questions: [
      q("main", "Which of the following best expresses the main point of the passage?", [1, 4], [
        o("Central banks should follow fixed formulas because officials cannot be trusted to use judgment.", "The passage says the problem is not that officials are ignorant or wicked, and it lists weaknesses of rigid rules.", "Distorts the passage"),
        o("The inflation of the 1970s was caused by central banks that lacked independence.", "The 1970s are mentioned as what made the argument persuasive. Their cause is not analysed.", "Out of scope"),
        o("Independent central banks have permanently solved the problem of inflation.", "Paragraph 4 says neither solution is perfect and reputations can be lost in months.", "Extreme wording"),
        o("Because a central bank's freedom to change course can undermine belief in its promises, the central problem is making its judgment credible.", "This joins the argument of paragraph 2 to the conclusion in paragraph 5: how to make discretion believable."),
      ]),
      q("inference", "According to the reasoning in the second paragraph, why does discretion lead to 'more inflation and no extra output'?", [1], [
        o("People expect the bank to be tempted into surprise inflation, so they raise wages and prices in advance and no surprise is possible.", "Because the temptation is anticipated and built into contracts, inflation rises but the output gain, which needed a surprise, never comes."),
        o("Officials lack the information they need to set interest rates correctly.", "The passage explicitly rejects ignorance as the problem.", "Distorts the passage"),
        o("Workers ignore the bank's announcements and set wages at random.", "Workers are described as anticipating the bank's behaviour, not ignoring it.", "Distorts the passage"),
        o("Unexpected inflation always lowers output in the long run.", "The passage says surprise inflation raises output for a while. 'Always lowers' is unsupported.", "Extreme wording"),
      ]),
      q("strengthen", "Which of the following, if true, would most strengthen the claim that credibility has 'real economic value'?", [4], [
        o("Central banks with fixed rules did worse during the pandemic than those with discretion.", "This concerns the weakness of rigid rules (paragraph 4), not the value of being believed.", "True but not the answer"),
        o("When a trusted central bank merely announces a future policy, market interest rates move almost as much as after an actual rate change.", "This shows words alone achieving real effects, which is exactly what paragraph 5 claims credibility allows."),
        o("Some governments have recently reduced the independence of their central banks.", "A report of what governments did says nothing about whether credibility has value.", "Out of scope"),
        o("Inflation was higher in the 1970s than in the 1990s in most countries.", "A difference in inflation across decades does not show that being believed is what produced it.", "Out of scope"),
      ]),
      q("except", "The passage mentions all of the following as weaknesses of the approaches it discusses EXCEPT:", [3], [
        o("a fixed rule may fail when an unforeseen shock arrives", "Stated in paragraph 4 with the example of a pandemic.", "True but not the answer"),
        o("constrained discretion depends on a reputation that is slow to build and quick to lose", "Stated in paragraph 4.", "True but not the answer"),
        o("independent central banks tend to be captured by the banks they supervise", "Capture by supervised banks is never mentioned, so this is the exception."),
        o("recent policies may have blurred the boundary between monetary and fiscal policy", "Stated at the end of paragraph 4.", "True but not the answer"),
      ]),
    ],
    recall: [
      recall("Which decade made the case against discretion persuasive?", ["The 1930s", "The 1990s", "The 2010s", "The 1970s"], 3),
      recall("What arrangement did most countries eventually prefer?", ["A fixed formula for interest rates", "Independence, an inflation target and a duty to explain decisions", "Control of interest rates by elected governments", "Abolishing inflation targets"], 1),
    ],
  },
  {
    id: "econ-lemons",
    title: "When buyers cannot see quality",
    genre: "economics",
    difficulty: "easy",
    paras: [
      "Imagine a market for used cars in which sellers know whether their car is reliable but buyers cannot tell. A buyer looking at two shiny hatchbacks of the same model and age has no way of knowing that one has been carefully maintained and the other has a failing gearbox. Faced with this uncertainty, the sensible buyer offers a price somewhere in the middle, reflecting the average quality of cars on sale.",
      "That middle price is the start of the trouble. Owners of good cars find it too low and keep their cars or sell them to friends. Owners of bad cars, known in American slang as lemons, find it generous and rush to sell. As good cars leave the market, the average quality of the cars still on offer falls, buyers lower their offers again, and more good cars withdraw. In the extreme, only lemons remain, and a market that could have benefited both sides shrinks or disappears.",
      "The economist George Akerlof described this process in a 1970 paper that several journals at first rejected as trivial. Its point was anything but. It showed that markets can fail not because people are irrational or greedy but because information is unevenly shared. The same logic applies wherever one side knows more than the other: insurance, where the people keenest to buy cover are often those most likely to claim; lending, where the borrowers most willing to accept a high interest rate may be the riskiest; and hiring, where an employer cannot easily observe how hard a candidate will work.",
      "Much of the machinery of modern commerce can be read as a response to the problem. Warranties let sellers of good products prove their confidence by promising repairs. Brands give firms a reputation to lose. Inspection services, credit scores and online ratings all try to move information from the side that has it to the side that needs it. Even a university degree may partly serve this purpose, signalling qualities to employers that they could not easily check.",
      "None of these remedies is complete, and some create problems of their own; ratings can be faked and degrees can be pursued for the signal rather than the learning. But the lesson has outlasted its rejections. Trust is not a soft extra in economic life. It is part of the infrastructure that allows markets to exist at all.",
    ],
    questions: [
      q("main", "The passage is mainly about:", [1, 2, 3], [
        o("why used cars lose their value faster than new cars", "Depreciation is never discussed. Used cars are only the opening example.", "Out of scope"),
        o("how unequal information between buyers and sellers can make markets shrink, and the devices that have grown up to deal with it", "This covers the mechanism (paragraphs 1 and 2), its generality (paragraph 3) and the remedies (paragraphs 4 and 5)."),
        o("the career of the economist George Akerlof", "Akerlof is mentioned only as the author of the idea.", "Too narrow or too broad"),
        o("the argument that markets fail because people are greedy", "Paragraph 3 says markets fail 'not because people are irrational or greedy'.", "Distorts the passage"),
      ]),
      q("detail", "According to the passage, why do owners of good cars withdraw from the market?", [0, 1], [
        o("Buyers can easily pick out the good cars and avoid them.", "The whole problem is that buyers cannot tell good cars from bad.", "Distorts the passage"),
        o("They prefer to keep cars that are still under warranty.", "Warranties appear later as a remedy, not as a reason for withdrawing.", "Out of scope"),
        o("The government restricts the sale of reliable cars.", "No government restriction is mentioned.", "Out of scope"),
        o("The price buyers will pay reflects average quality, which is too low for a good car.", "Paragraph 2: owners of good cars 'find it too low and keep their cars'."),
      ]),
      q("application", "Which of the following situations is most similar to the problem the passage describes?", [2], [
        o("A health insurer finds that people who know they are unwell are the most likely to buy its expensive policies.", "The buyer of insurance knows more about their own risk than the insurer, exactly the insurance case in paragraph 3."),
        o("A bakery raises its prices after the cost of flour rises.", "This is about costs, not about one side knowing more than the other.", "Out of scope"),
        o("A used-car dealer that offers a long warranty attracts buyers willing to pay more.", "This describes a remedy from paragraph 4, not the problem itself.", "True but not the answer"),
        o("A shop sells more umbrellas in the rainy season.", "Seasonal demand has nothing to do with hidden quality.", "Out of scope"),
      ]),
      q("structure", "The remark that the paper was 'at first rejected as trivial' mainly serves to:", [2, 4], [
        o("suggest that academic journals are usually wrong about economics", "One episode does not support 'usually wrong'.", "Extreme wording"),
        o("cast doubt on whether Akerlof's argument is correct", "The author immediately says its point was 'anything but' trivial.", "Distorts the passage"),
        o("highlight that an idea now seen as important was at first underrated", "The contrast between 'trivial' and 'anything but', echoed in 'outlasted its rejections', makes this point."),
        o("explain why the theory applies mainly to used cars", "Paragraph 3 says the logic applies to insurance, lending and hiring too.", "Distorts the passage"),
      ]),
    ],
    recall: [
      recall("When did Akerlof publish the paper?", ["1950", "1970", "1990", "2008"], 1),
      recall("Which of these does the passage give as a remedy?", ["Price controls", "Import taxes", "Rent limits", "Warranties"], 3),
    ],
  },
  {
    id: "econ-minwage",
    title: "A natural experiment on the minimum wage",
    genre: "economics",
    difficulty: "medium",
    paras: [
      "The textbook prediction about minimum wages is simple. If the price of labour is pushed above what the market would set, employers will buy less of it, so a higher minimum wage should cost some low-paid workers their jobs. Most introductory courses still teach it with a simple diagram of supply and demand, in which any wage floor above the market rate leaves some willing workers without jobs. For decades most economists accepted this reasoning, and the debate was mainly about how many jobs would be lost.",
      "In 1992 New Jersey raised its minimum wage while neighbouring Pennsylvania did not. The economists David Card and Alan Krueger surveyed fast-food restaurants on both sides of the border before and after the change, treating Pennsylvania as a guide to what would have happened in New Jersey without the increase. Fast-food chains were a sensible choice: they employ many low-wage workers, pay close to the minimum and sell the same products on both sides of the state line, so a difference in employment was unlikely to come from other causes. They found no fall in employment in New Jersey relative to Pennsylvania; if anything, employment there rose slightly.",
      "The study provoked fierce criticism. Some economists questioned the survey data and produced payroll records that told a different story; others argued that a single state over a single year could not overturn a well-established principle. But the method, which treated a policy change as a natural experiment and compared similar places that happened to be treated differently, spread rapidly, and many later studies of moderate increases have found small or no effects on employment. Card shared a Nobel prize in 2021 partly for this work.",
      "One explanation is that many low-wage labour markets are not the competitive markets of the textbook. Workers in a small town may have few other employers to turn to, so a firm that pays a little less loses few of them. Where a few large employers dominate a town, they can pay less than the value of a worker's labour, and a minimum wage can raise pay without reducing jobs, up to a point. That qualification matters. The evidence concerns moderate increases; it does not show that any minimum wage, however high, is costless, and economists still disagree about where the limit lies.",
    ],
    questions: [
      q("main", "Which of the following best expresses the main idea of the passage?", [1, 2, 3], [
        o("Minimum wages never reduce employment.", "The last paragraph limits the finding to moderate increases.", "Extreme wording"),
        o("Pennsylvania's economy grew faster than New Jersey's in the 1990s.", "Pennsylvania serves only as a comparison.", "Out of scope"),
        o("Card and Krueger's data were shown to be false.", "Their data were questioned, and later studies largely agreed with them.", "Distorts the passage"),
        o("A natural experiment challenged the view that minimum wages cost jobs, showing that moderate rises can leave employment intact, within limits.", "Covers the textbook view, the study, its influence and the qualification."),
      ]),
      q("detail", "Why did Card and Krueger survey restaurants in Pennsylvania?", [1], [
        o("Pennsylvania had raised its minimum wage first.", "Pennsylvania did not raise its minimum wage.", "Distorts the passage"),
        o("To estimate what would have happened in New Jersey without the increase.", "Paragraph 2 says Pennsylvania was used as this guide."),
        o("Because restaurants in New Jersey refused to take part.", "Nothing suggests a refusal.", "Out of scope"),
        o("To show that fast-food workers earn more in Pennsylvania.", "The comparison was of employment, not pay.", "Out of scope"),
      ]),
      q("inference", "The author would most likely agree that:", [3], [
        o("a very large rise in the minimum wage could reduce employment", "The evidence 'does not show that any minimum wage, however high, is costless'."),
        o("the textbook model describes every labour market accurately", "Paragraph 4 says many low-wage markets are not like the textbook.", "Distorts the passage"),
        o("the criticism of the New Jersey study had no merit at all", "The author reports the criticism without dismissing it.", "Extreme wording"),
        o("natural experiments are less reliable than surveys", "The passage praises the natural-experiment method.", "Distorts the passage"),
      ]),
      q("structure", "The fourth paragraph mainly serves to:", [3], [
        o("restate the textbook prediction", "The textbook prediction is in paragraph 1.", "Distorts the passage"),
        o("describe the criticism of the New Jersey study", "The criticism is in paragraph 3.", "Distorts the passage"),
        o("offer an explanation for the findings and limit how far they apply", "It explains through dominant employers, then restricts the finding to moderate increases."),
        o("call for higher minimum wages in every country", "No policy is recommended.", "Out of scope"),
      ]),
    ],
    recall: [
      recall("Which state raised its minimum wage in 1992?", ["Pennsylvania", "New York", "New Jersey", "Delaware"], 2),
      recall("What kind of businesses did the economists survey?", ["Fast-food restaurants", "Farms", "Factories", "Banks"], 0),
    ],
  },
  {
    id: "econ-commons",
    title: "Beyond the tragedy of the commons",
    genre: "economics",
    difficulty: "hard",
    since: "2026-10-18",
    paras: [
      "In 1968 the ecologist Garrett Hardin described what he called the tragedy of the commons. Imagine a pasture open to all. Each herder gains the full benefit of adding one more animal but bears only a share of the cost of overgrazing, so each keeps adding animals until the pasture is ruined. Hardin concluded that shared resources must be either divided into private property or controlled by the state. The argument seemed to explain everything from emptied fisheries to polluted rivers, and his essay became one of the most cited in the social sciences.",
      "The political scientist Elinor Ostrom spent decades testing the claim against the record, and found it wanting. Swiss villages had managed alpine meadows in common for centuries; Japanese villages had shared forests; farmers in Spain and the Philippines had run irrigation systems that no single owner controlled. Some of these arrangements had outlasted the governments around them. Their users were neither private owners nor agents of a distant state, yet their resources had not collapsed. Hardin, she argued, had described a pasture with no rules, which is not what most real commons were.",
      "From hundreds of cases, successful and failed, Ostrom drew a set of design principles. Successful commons had clear boundaries, so that everyone knew who had rights to use the resource. The people bound by the rules had a say in making them. Users or their agents monitored one another, penalties for breaking the rules started small and grew with repetition, and disputes could be settled cheaply and quickly. Graduated penalties mattered because a first offence was often a mistake, and a harsh response could destroy the trust the system relied on. Outside authorities, crucially, respected the community's right to organise itself.",
      "Ostrom did not claim that communities always succeed; her principles were drawn partly from failures, and they fit small groups who know each other better than global problems such as the atmosphere or the high seas. Nor did she reject markets or governments, insisting that no single arrangement suits every resource. Her achievement, recognised in 2009 with the Nobel prize in economics, the first awarded to a woman, was to replace a choice between two solutions with a question about institutions: what rules, made by whom, allow people to share without ruin?",
    ],
    questions: [
      q("main", "Which of the following best summarises the passage?", [0, 1, 3], [
        o("Hardin proved that shared resources are always destroyed.", "Ostrom found many commons that had not collapsed.", "Extreme wording"),
        o("Private property is the only reliable way to protect a resource.", "Ostrom showed communities can manage resources, and rejected any single answer.", "Distorts the passage"),
        o("Swiss villagers invented the idea of common land.", "Swiss meadows are one example among several.", "Out of scope"),
        o("Ostrom showed that communities can manage shared resources under the right rules, turning Hardin's either-or into a question about institutions.", "Covers Hardin's claim, Ostrom's evidence, her principles and her achievement."),
      ]),
      q("inference", "Ostrom's remark that Hardin 'had described a pasture with no rules' implies that:", [1], [
        o("Hardin's pasture could not have existed anywhere", "She says it is not what most real commons were, not that it is impossible.", "Extreme wording"),
        o("his conclusion followed from leaving out the rules that real communities make", "Real commons had rules; a pasture without them is a special case."),
        o("real pastures are always well managed", "She drew lessons from failures too.", "Extreme wording"),
        o("rules are unnecessary for managing a commons", "Her whole argument is about rules.", "Distorts the passage"),
      ]),
      q("except", "Which of the following is NOT one of Ostrom's design principles as the passage describes them?", [2], [
        o("dividing the resource into private plots", "That is one of Hardin's two solutions, not an Ostrom principle."),
        o("clear boundaries on who may use the resource", "Named in paragraph 3.", "True but not the answer"),
        o("penalties that grow with repeated breaches", "Named in paragraph 3.", "True but not the answer"),
        o("cheap and quick ways to settle disputes", "Named in paragraph 3.", "True but not the answer"),
      ]),
      q("application", "Which of the following situations would Ostrom's principles most likely help with?", [3], [
        o("Cutting greenhouse gas emissions across the whole world", "Her principles fit small groups better than global problems such as the atmosphere.", "Distorts the passage"),
        o("Setting share prices on a stock exchange", "Not a shared natural resource.", "Out of scope"),
        o("Several neighbouring villages sharing a lake for fishing", "A small group sharing a local resource is the kind of case her principles came from."),
        o("Deciding who inherits a family farm", "A question of private ownership, not a commons.", "Out of scope"),
      ]),
    ],
    recall: [
      recall("Who described the tragedy of the commons in 1968?", ["Elinor Ostrom", "Garrett Hardin", "Adam Smith", "John Maynard Keynes"], 1),
      recall("What did Ostrom win in 2009?", ["The Nobel prize in economics", "The Nobel peace prize", "An Olympic medal", "The Booker prize"], 0),
    ],
  },
];
