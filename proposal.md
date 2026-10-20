

  






DESIGN, DEVELOPMENT, AND EVALUATION OF A PERSONALIZED FINANCIAL LITERACY LEARNING PLATFORM FOR UNIVERSITY STUDENTS IN RWANDA


BSc. in Software Engineering

Precious Chibundu Mozia







Supervisor 
Thadee Gatera


Date:
10th September 2026




















TABLE OF CONTENTS
CHAPTER ONE: INTRODUCTION
1.1 Background to the Study
1.2 Statement of the Problem
1.3 Aim and Objectives
1.4 Research Questions
1.5 Scope
1.6 Significance and Justification
1.7 Budget
1.8 Timeline
1.9 Definition of Key Terms
CHAPTER TWO: LITERATURE REVIEW
2.1 Introduction
2.2 Conceptual Review
2.3 Historical Background
2.4 Theoretical Review
2.5 Overview of Existing Systems
2.6 Review of Related Works
2.7 General Comments and Research Gap
CHAPTER THREE: RESEARCH METHODOLOGY AND SYSTEM DESIGN
3.1 Introduction
3.2 Research Design
3.3 System Analysis
3.4 System Design
3.5 Development Tools
3.6 Ethical Considerations and Limitations
REFERENCES























LIST OF TABLES
Table 1. Proposed project budget
Table 2. Proposed project timeline
Table 3. Summary of reviewed literature
Table 4. Comparison of existing systems
Table 5. Functional requirements
Table 6. Non-functional requirements
Table 7. Evaluation metrics

















LIST OF FIGURES
Figure 1. Conceptual framework
Figure 3. Proposed system architecture
Figure 2. Recommendation and learning flow
Figure 5. Use case diagram
Figure 4. Entity relationship diagram
Figure 6. UML class diagram
Figure 7. Blockchain micro-credential issuance and verification sequence diagram

















LIST OF ACRONYMS AND ABBREVIATIONS
ALU - African Leadership University
API - Application Programming Interface
DFL - Digital Financial Literacy
ERD - Entity Relationship Diagram
HEI - Higher Education Institution
OECD - Organisation for Economic Co-operation and Development
SDLC - Software Development Life Cycle
SUS - System Usability Scale
TAM - Technology Acceptance Model
UI - User Interface
UX - User Experience













CHAPTER ONE: INTRODUCTION
1.1 Background to the Study
Financial literacy refers to the knowledge, skills, attitudes, and behaviours that enable individuals to make informed financial decisions and manage financial resources effectively. It includes practical competencies such as budgeting, saving, responsible borrowing, understanding interest and risk, evaluating financial products, and planning for future needs. Financial literacy is especially important for young adults because the transition to university and early adulthood often introduces independent financial responsibilities before individuals have accumulated substantial financial experience. International evidence has repeatedly shown that financial education can improve financial knowledge, although the magnitude and persistence of behavioural effects depend on context, timing, delivery method, and learner characteristics (Fernandes et al., 2014; Kaiser et al., 2022).
University students are a particularly relevant group for financial literacy interventions. They frequently manage allowances, scholarships, stipends, rent, food, transportation, digital payments, informal borrowing, and sometimes income from part-time work or entrepreneurship. These decisions occur in an environment where mobile money, digital lending, online investment information, and social-media financial advice are increasingly accessible. As a result, the challenge is no longer limited to knowing basic financial concepts; students also need digital financial literacy: the ability to use digital financial services safely, interpret information, recognize risks, and make reasoned decisions in technology-mediated financial environments.
The Rwandan context makes this issue timely. A 2026 mixed-methods study of 300 Rwandans aged 18–32 reported gaps in digital financial literacy and highlighted the importance of targeted interventions for young people (Preliminary Insights on Digital Financial Literacy Gaps Among Rwandan Youth and Considerations for AI-Powered Interventions, 2026). Earlier experimental evidence from Rwanda also showed that financial education can influence financial knowledge and behaviour, although that work focused on rural populations rather than university students (Sayinzoga et al., 2016). These studies establish the relevance of financial education in Rwanda while leaving room for research on university-specific, software-supported, personalized learning approaches.
Traditional approaches to financial education commonly rely on classroom lectures, seminars, printed materials, or one-time workshops. These methods can provide useful foundational knowledge, but they often present the same content to every learner and may not provide continuous feedback, progress tracking, or individualized learning pathways. Digital financial education tools provide an alternative by allowing content to be accessed repeatedly, supporting quizzes and feedback, and collecting learning data. For example, the Finlite mobile application was evaluated with 400 undergraduate business students and was associated with improvements in several financial-literacy-related outcomes, illustrating the potential of digital tools in university financial education (Khoo et al., 2022).
From a software engineering perspective, personalization is valuable because students do not enter a learning environment with identical knowledge gaps. A learner who understands budgeting but performs poorly on debt and interest questions should not necessarily receive the same sequence as a learner who needs foundational support in saving. Personalized learning environments use learner attributes such as prior knowledge, preferences, or performance to recommend appropriate learning resources. A systematic review of adaptive content recommenders found that knowledge level and other learner attributes are commonly used to generate recommendations and that systems are evaluated through prediction correctness, learner satisfaction, and usability (Raj & Renumol, 2022). For a capstone-scale system, a transparent rule-based approach is appropriate because the recommendation logic can be directly mapped from diagnostic assessment scores to predefined learning modules and tested for consistency and accuracy.
This study therefore proposes the design, development, and evaluation of a personalized financial literacy learning platform for university students in Kigali, Rwanda. The platform will include registration and authentication, a diagnostic assessment, domain-level scoring, a transparent rule-based recommendation engine, short curated financial literacy learning modules, practical activities, quizzes, progress tracking, and a dashboard. Core learning content will be developed from credible financial-literacy sources and rewritten into concise, student-friendly lessons; selected external resources may be provided only as supplementary material. When a learner successfully demonstrates a defined competency, the platform will be able to issue a small digital learning achievement (micro-credential). A lightweight blockchain component will register minimal verification information for that micro-credential so that it can later be checked without storing personal or assessment data on-chain.


1.2 Statement of the Problem
University students in Kigali increasingly make financial decisions involving budgeting, saving, digital payments, borrowing, and online financial information, yet financial knowledge and digital financial literacy are not necessarily uniform across learners. Recent evidence from 300 Rwandans aged 18–32 found modest financial knowledge, moderate digital literacy, and important cybersecurity awareness-practice gaps, demonstrating that access to digital financial services does not automatically imply strong financial capability (Ntakirutimana et al., 2026). University students may therefore have different knowledge gaps and require targeted learning rather than assuming the same starting point for every learner.
The second sub-problem concerns how financial education is delivered through software. Digital applications can improve access and support learning, but a fixed sequence of generic content does not exploit the ability of software to adapt the learning pathway to evidence about the learner. Existing work on adaptive content recommendation shows that learner knowledge is commonly used to select appropriate learning resources (Raj & Renumol, 2022). There is therefore a software-design opportunity to assess students by financial-literacy domain, identify weaker domains, and map those gaps transparently to short, curated learning modules, activities, and quizzes that can be completed and tracked within one platform.
The third sub-problem concerns how demonstrated learning can be represented after a student completes a targeted module. Micro-credentials provide small records of specific knowledge, skills, or learning achievements, while blockchain-based micro-credential systems have been investigated for managing, verifying, storing, and sharing such records (Alsobhi et al., 2023). However, credential infrastructure is often studied separately from the personalized learning process. This study therefore proposes a lightweight approach in which blockchain is secondary to the main learning system: after a learner satisfies predefined completion and quiz criteria for a financial-literacy competency, the platform creates a micro-credential and registers only minimal verification information or a cryptographic hash on an Ethereum test network. Personal information, assessment responses, and detailed learning records remain in the application database.


1.3 Aim and Objectives
Overall Aim
To develop and evaluate a software solution that provides assessment-based personalized financial literacy learning and verifiable learning achievements for university students in Kigali, Rwanda.
Specific Objectives
1. To identify financial literacy knowledge gaps and learning needs among selected university students in Kigali through a review of relevant literature and a needs assessment.
2. To design and develop a personalized financial literacy learning platform that recommends short, curated learning modules based on students’ assessed knowledge gaps, tracks learning progress, and issues verifiable micro-credentials for demonstrated financial-literacy competencies.
3. To evaluate the developed platform in terms of financial knowledge improvement, recommendation accuracy and relevance, usability, technical performance, and blockchain-based micro-credential issuance and verification.
1.4 Research Questions
1. What financial literacy knowledge gaps and learning needs are experienced by university students in Kigali, Rwanda?
2. How can a personalized financial literacy learning platform be designed to recommend learning content based on students’ assessed knowledge gaps?
3. To what extent does the developed platform improve students’ financial literacy knowledge based on pre-test and post-test scores?
4. How relevant and usable do university students perceive the personalized learning recommendations and platform?
5. How accurately and efficiently does the platform generate personalized learning recommendations and issue and verify blockchain-based micro-credentials for demonstrated financial-literacy competencies?


1.5 Scope
The study will focus geographically on university students in Kigali, Rwanda, with African Leadership University serving as the principal accessible study site. The needs-assessment phase will target approximately 30–50 students, while the platform evaluation will target approximately 30 students who meet the inclusion criteria and consent to participate. The project is intended as a capstone-scale study and does not claim national representativeness.
Technically, the project will develop a responsive web application with authentication, a diagnostic financial literacy assessment, domain scoring, a rule-based recommendation engine, short curated learning modules, practical learning activities, quizzes, progress tracking, a dashboard, and a lightweight micro-credential service. The prototype will focus on a limited set of domains such as budgeting, saving and emergency funds, debt management, introductory investing, and digital financial literacy/safety. Learning content will be synthesized from credible financial-literacy sources into original concise notes and examples; external videos or articles may be linked only as supplementary resources. Blockchain will be used only after successful competency completion to register minimal verification information for a micro-credential on an Ethereum test network. Sensitive learner data will remain off-chain.
The evaluation scope is limited to short-term and directly measurable outcomes. These include pre-test/post-test knowledge change, recommendation accuracy against predefined domain rules, perceived recommendation relevance, usability, task completion, response time, error frequency, and credential issuance/verification success. Long-term saving, borrowing, investment, or wealth outcomes are outside the scope because they cannot be validly established during a short capstone pilot.
1.6 Significance and Justification
For students, the platform may provide a structured way to identify financial knowledge gaps and receive learning content that is more relevant to those gaps than a one-size-fits-all sequence. The diagnostic and progress features may also help learners understand what they have mastered and what still requires attention.
For universities and other educational stakeholders, the project may demonstrate a practical supplementary approach to financial capability education that can be delivered outside a formal finance course. Its micro-credential feature also illustrates how specific demonstrated competencies can be represented as small digital achievements and checked by an external verifier without exposing the learner’s detailed assessment data.
For software engineering research and practice, the study integrates requirements analysis, full-stack development, rule-based recommendation logic, database design, usability evaluation, software performance testing, and smart-contract interaction in one contextually grounded system. It contributes evidence from a Rwandan university setting where integrated research on personalized financial literacy learning remains limited.
1.7 Budget
Item
Purpose
Estimated Cost (RWF)
Internet/data
Research, development, testing and deployment
40,000
Domain/hosting
Pilot deployment and access
35,000
Transport
Participant coordination and research activities
40,000
Printing/stationery
Consent forms, research documentation
20,000
Participant refreshments
Pilot/testing sessions where permitted
40,000
Contingency
Unexpected project expenses
30,000
Total


205,000

Table 1. Proposed project budget.
1.8 Timeline
Activity
Sep
Oct
Nov
Dec
Jan
Feb
Literature review & proposal
●
●








Needs assessment & requirements


●
●






UI/database/system design


●
●






Core platform development




●
●




Blockchain credential module






●
●


Testing & pilot evaluation








●
●
Analysis, revision & final report










●

Table 2. Proposed six-month project timeline.


1.9 Definition of Key Terms
Financial literacy: The knowledge and capability required to understand financial concepts and make informed decisions about managing money and financial products.
Digital financial literacy: The knowledge and skills required to use digital financial services safely and effectively and to evaluate risks and information in digital financial environments.
Personalized learning: An approach in which learning content or pathways are adjusted according to learner characteristics such as prior knowledge, assessment performance, or progress.
Rule-based recommendation engine: A software component that applies explicit predefined conditions to learner assessment scores in order to select appropriate learning modules.
Blockchain: A distributed ledger technology used in this project only as a secondary, tamper-evident verification registry for issued financial-literacy micro-credentials.
Micro-credential: A small digital record indicating that a learner has successfully demonstrated a defined financial-literacy competency after satisfying specified completion and assessment criteria.
Usability: The extent to which intended users can use a system effectively, efficiently, and satisfactorily for specified tasks.










CHAPTER TWO: LITERATURE REVIEW
2.1 Introduction
This chapter reviews literature relevant to the proposed software solution and establishes the research gap that motivates the study. A structured literature search was used rather than claiming a full systematic review. Search terms combined concepts such as “financial literacy university students,” “digital financial literacy Rwanda,” “financial education application,” “personalized learning,” “adaptive content recommender,” “e-learning recommender system,” “micro-credentials higher education,” and “blockchain credential verification.” Priority was given to peer-reviewed journal articles and systematic reviews published mainly from 2020 to 2026, while older foundational studies were retained where necessary for theory and Rwandan context. Sources were located through Google Scholar and publisher/indexing platforms including ScienceDirect, SpringerLink, IEEE Xplore, and PubMed/PMC. The final core set used in this proposal was selected for direct relevance to financial literacy interventions, personalized learning/recommender systems, higher education, Rwanda or comparable contexts, and blockchain credentials.
The literature is organized into conceptual review, historical background, theoretical review, existing software systems, and empirical related works. The chapter deliberately connects educational research to software engineering questions: how learner evidence can be converted into transparent recommendations, how curated in-platform learning can be aligned with assessed gaps, how the system can be evaluated technically and educationally, and how blockchain can be used selectively for micro-credential verification without exposing sensitive learner data.
2.2 Conceptual Review
2.2.1 Financial Literacy and Digital Financial Literacy
Financial literacy is multidimensional. It includes factual knowledge, but it also involves the ability to apply knowledge when making financial decisions. Research distinguishes between knowing concepts and producing downstream behaviour. Fernandes et al. (2014), for example, found that financial education effects on later behaviour can be modest and decay over time, which cautions against treating short educational interventions as proof of permanent behavioural change. More recent meta-analytic evidence indicates that financial education can positively affect financial knowledge and some downstream behaviours, while effects vary by intervention design and context (Kaiser et al., 2022). For the present project, the most defensible short-term outcome is therefore knowledge improvement rather than long-term behaviour change.
Digital financial literacy extends financial capability into technology-mediated environments. Users need to understand not only financial concepts but also the characteristics and risks of digital payments, online financial information, scams, privacy, digital lending, and technology-enabled investment products. Ntakirutimana et al. (2026) surveyed 300 Rwandans aged 18–32 and reported modest financial knowledge, moderate digital literacy, and cybersecurity awareness-practice gaps. Their findings provide recent Rwanda-specific evidence that targeted digital financial-literacy interventions merit consideration and support the inclusion of digital financial literacy as one assessment and learning domain in the proposed platform.
2.2.2 Personalized Learning
Personalized learning adjusts the learning experience according to learner characteristics, needs, or progress. In digital environments, personalization can be implemented through learner profiles, diagnostic assessments, content sequencing, adaptive difficulty, recommendation systems, or feedback. The central assumption is that learners benefit when the system recognizes meaningful differences rather than presenting an identical pathway to everyone. This is directly relevant to financial literacy because a student can be strong in one domain and weak in another.
A personalized system does not necessarily require machine learning. Raj and Renumol (2022) show that adaptive content recommenders use a range of learner attributes and recommendation approaches. While many advanced systems use collaborative filtering, content-based methods, ontologies, or hybrid techniques, the core design problem is still the mapping between learner evidence and suitable learning resources. A transparent rule-based approach is appropriate for this project because the learner evidence is a small set of domain scores and the number of learning modules is limited. The rules can be inspected, tested, and explained to users and evaluators.
2.2.3 Recommendation Systems in E-Learning
E-learning recommender systems help learners select resources from available content based on learner goals, preferences, knowledge, or behaviour. Joy and Pillai (2022) note that content recommenders have become increasingly relevant as digital learning materials expand. Raj and Renumol (2022) reviewed 52 publications and found that knowledge level, learning style, preferences, and other learner characteristics were frequently used as recommendation inputs. Evaluation commonly addressed the correctness of recommendations and, in some studies, learner satisfaction or usability. These findings support the inclusion of both an objective recommendation-accuracy measure and a subjective relevance measure in the present study.
In the proposed platform, recommendation logic will be intentionally simple. Each diagnostic question will belong to a financial literacy domain. After the assessment, the system will calculate a percentage score for each domain. A predefined threshold, initially 60%, will identify domains requiring further learning. Modules linked to those weak domains will be prioritized. The exact threshold and mapping will be reviewed during instrument design and pilot testing. This design creates a clear ground truth against which the software recommendation can be tested.
2.2.4 Learning Content, Micro-Credentials, and Blockchain
The learning intervention in this study will use short, curated in-platform modules rather than relying primarily on external courses or videos. Each module will be linked to a defined financial-literacy domain and learning objectives. Content will be synthesized from credible financial-literacy and educational sources into original student-friendly notes, examples, practical activities, and quizzes. External videos or articles may be included as optional supplementary resources. Keeping the core learning experience inside the platform allows the study to align diagnostic questions, recommended content, module quizzes, and progress tracking more consistently.
A micro-credential is a small record of demonstrated knowledge, skill, or experience. Alsobhi et al. (2023) describe blockchain-based micro-credential platforms in higher education and identify requirements for managing, verifying, storing, and sharing micro-credentials; their review also discusses systems that connect personalized learning recommendations with micro-credential management. This makes micro-credentials relevant to the present platform after, rather than before, learning has occurred. Once a student completes a recommended module and satisfies a predefined competency threshold, the application can create a micro-credential for that specific competency. A cryptographic hash or other minimal verification record will then be registered through a smart contract on the Ethereum Sepolia testnet. Detailed learner records remain in the normal database. The purpose is not for the platform merely to “verify itself,” but to allow a credential presented by the learner to be checked later by a separate verifier against the blockchain record. Rustemi et al. (2023) further show that blockchain-based academic certificate verification is an established research area, while also highlighting the importance of implementation design and security considerations.
2.2.5 Usability and Technical Quality
A successful educational application must be usable as well as educationally meaningful. If users cannot navigate the assessment, understand recommendations, access modules, or interpret progress information, the intended learning design is weakened. Usability evaluation therefore complements knowledge testing. The System Usability Scale (SUS) is a widely used standardized instrument for obtaining a global usability score from users after system interaction. In addition, task completion, observed errors, and qualitative feedback can reveal specific interface problems.
Technical evaluation is also required because this is a software engineering project. Relevant measures include page or operation response time, successful login and assessment completion, recommendation generation time, database or API errors, quiz submission success, and credential issuance/verification success. These measures directly answer the facilitator’s concern that the project should include a technical research question rather than evaluating only whether users liked the platform.
2.3 Historical Background
2.3.1 Origins and Early Context
Financial education has historically been delivered through classroom teaching, community training, printed guides, and institutional counselling. Early research often focused on whether exposure to financial education improved knowledge or later financial behaviour. As financial products became more complex and consumer responsibility increased, financial literacy developed into a broader research field concerned with knowledge, attitudes, behaviours, and decision-making. In Rwanda, experimental work by Sayinzoga et al. (2016) demonstrated the relevance of financial literacy interventions in a local setting, although the study population and delivery model differed from the university-focused software system proposed here.


2.3.2 Key Milestones
The growth of mobile devices, online learning, and digital financial services created a shift from purely face-to-face financial education toward digital delivery. Applications such as Finlite demonstrate that financial literacy content can be integrated into a mobile learning experience and evaluated with university students (Khoo et al., 2022). In parallel, educational technology research increasingly explored adaptive and personalized learning, including content recommenders that use learner knowledge and performance to select resources (Raj & Renumol, 2022).
A further milestone has been the emergence of digital badges and micro-credentials as ways to represent smaller units of learning. The need to manage and verify such achievements has encouraged experimentation with blockchain. Systematic reviews published in 2023 show that blockchain-based micro-credentialing and academic credential verification have become established research topics, although significant issues remain around standards, privacy, governance, adoption, and implementation (Alsobhi et al., 2023; Rustemi et al., 2023).
2.3.3 Historical Gaps and Transition to the Current Study
These historical developments have often progressed as separate streams: financial education research studies knowledge and behaviour; personalized learning research studies learner modelling and recommendation; software engineering studies system quality; and blockchain education research studies credentials. The present study brings a small, feasible subset of these streams together. It does not attempt to build a complex adaptive AI system, a cryptocurrency application, or a decentralized finance product. Instead, it applies a diagnostic-and-rule approach to personalized financial literacy learning, delivers curated modules inside the platform, and uses blockchain only after successful learning to support verification of specific micro-credentials.
2.4 Theoretical Review
2.4.1 Technology Acceptance Model
The Technology Acceptance Model (TAM) proposed by Davis (1989) explains user acceptance of information technology primarily through perceived usefulness and perceived ease of use. TAM is relevant because the proposed platform can only support learning if students are willing and able to use it. Perceived usefulness is reflected in whether students believe the platform and its recommendations help them learn relevant financial concepts, while perceived ease of use relates to navigation, clarity, and interaction effort. TAM therefore supports the usability and perceived-relevance components of the evaluation without requiring the study to test a large causal acceptance model.
2.4.2 Constructivist and Self-Directed Learning Perspective
The instructional design also draws on the idea that learners construct understanding by engaging actively with content, feedback, and prior knowledge. The diagnostic assessment activates prior knowledge; personalized modules focus attention on identified gaps; quizzes provide opportunities to apply concepts and receive feedback; and progress information supports self-monitoring. This perspective is consistent with learner-centred digital education and justifies an experience that is more interactive than simply displaying financial information.
2.4.3 Proposed Theoretical Framework
The study combines these ideas in a practical framework: prior financial knowledge is measured through a diagnostic assessment; domain scores determine personalized recommendations; students interact with targeted in-platform learning modules, activities, and quizzes; the system records progress; successful demonstration of a defined competency can result in a micro-credential; and evaluation measures knowledge change, recommendation quality, usability, technical performance, and credential issuance/verification. TAM informs the user-acceptance side of the framework, while personalized learning principles explain the assessment-to-recommendation mechanism.

Figure 1. Conceptual framework of the proposed platform.
2.5 Overview of Existing Systems
Existing software relevant to this project can be grouped into financial literacy learning applications, general e-learning systems, personalized content recommenders, and digital credential systems. No single reviewed system was selected as a direct template; instead, features and limitations were compared to identify what the proposed project should include and what it should avoid.
2.5.1 Strengths and Weaknesses of Existing Systems
System / approach
Strengths
Weaknesses / gap relative to this project
Finlite app (Khoo et al., 2022)
University-focused digital financial literacy; evaluated with students; demonstrates value of app-based intervention.
Context is Malaysia and business/economics education; not designed around Rwandan student needs or the proposed transparent domain-threshold recommendation model.
Adaptive e-learning content recommenders (Raj & Renumol, 2022)
Use learner attributes and knowledge to tailor content; provide established recommendation and evaluation concepts.
Many approaches are algorithmically complex or domain-general; may be excessive for a small financial literacy capstone.
General LMS platforms
Strong content delivery, quizzes, user management and reporting.
Personalized financial-literacy diagnosis and recommendation require custom configuration; credential verification is not the core purpose.
Blockchain micro-credential systems (Alsobhi et al., 2023; Rustemi et al., 2023)
Support management, integrity, sharing, and verification of digital learning achievements.
Often focus on credential infrastructure rather than the learning process; introduce privacy, governance, usability, and implementation complexity.
Proposed platform
Integrates diagnostic assessment, rule-based personalization, curated in-platform learning, quizzes, progress tracking, evaluation, and lightweight micro-credential verification.
Pilot scale; limited content domains; rule-based personalization is less adaptive than data-driven models; evaluation is short term.

Table 4. Comparison of existing systems and approaches.
2.6 Review of Related Works (Empirical Review)
Khoo et al. (2022) evaluated the Finlite mobile application with 400 undergraduate business students in Malaysia using a quasi-experimental pre-intervention design, quiz data, and questionnaires. The study reported positive effects across several financial literacy-related outcomes but did not find that the application solved all financial problems such as credit-card debt or poor spending behaviour. The work supports digital financial education while also reinforcing the need to limit claims about behaviour.
The 2026 Rwandan digital financial literacy study surveyed 300 people aged 18–32 and used a two-phase mixed-methods design to explore financial knowledge, digital skills, and financial behaviours. Its importance to the present study is contextual: it provides recent evidence that digital financial literacy gaps exist among Rwandan youth and that targeted interventions merit consideration. However, it is primarily a diagnostic research study rather than an implemented personalized learning platform.
Raj and Renumol (2022) systematically reviewed adaptive content recommenders in personalized learning environments and analyzed 52 publications from 2015 to 2020. Their synthesis shows that learner knowledge and preferences are common personalization inputs and that recommendation correctness, learner satisfaction, and usability are important evaluation dimensions. This directly informs the proposed use of diagnostic domain scores and the dual evaluation of objective recommendation accuracy and perceived relevance.
Joy and Pillai (2022) reviewed and classified content recommenders in e-learning environments. Their work reinforces the role of recommender systems in helping learners navigate large amounts of learning material and provides a broader software context for personalization. The proposed project differs by using a deliberately interpretable rule set rather than a sophisticated collaborative, content-based, ontology-based, or hybrid recommender because the capstone has a small user base and a limited, curated content catalogue.
Alsobhi et al. (2023) conducted a systematic literature review of blockchain-based micro-credentialing systems in higher education. The review identified requirements for managing, verifying, storing, and sharing micro-credentials and discussed both credential-management platforms and intelligent platforms that connect learner information with personalized recommendations. Rustemi et al. (2023) separately reviewed blockchain-based systems for academic certificate verification. Together with Ahsan et al. (2023), these works establish that blockchain credential verification and micro-credential management are legitimate educational-technology research areas. For the present study, however, blockchain remains deliberately secondary: it is activated only after a learner demonstrates a defined financial-literacy competency, and it stores only minimal verification information rather than personal or assessment data.
2.6.1 Summary of Reviewed Literature
Study
Context / method
Key finding relevant to project
Gap / implication
Sayinzoga et al. (2016)
Experimental financial literacy study, rural Rwanda
Financial education can affect knowledge/behaviour in Rwanda.
Different population and not a personalized software platform.
Khoo et al. (2022)
Finlite app; 400 Malaysian undergraduates
Digital tool improved several financial literacy outcomes.
Not Rwanda-specific; limited personalization emphasis.
Raj & Renumol (2022)
SLR of 52 adaptive content recommender studies
Learner knowledge is a common personalization input; correctness/usability are relevant metrics.
Many systems use complex techniques; need feasible transparent approach.
Joy & Pillai (2022)
Review of e-learning content recommenders
Recommenders support selection of appropriate learning resources.
Domain-general; does not solve Rwanda financial literacy context.
Ahsan et al. (2023)
SLR of micro-credentials in higher education
Digital badges/micro-credentials are growing in HE.
Implementation and recognition vary.
Alsobhi et al. (2023)
SLR of blockchain micro-credentialing
Blockchain can support validation of micro-credentials; requirements and gaps remain.
Credential focus, not financial literacy learning.
Ntakirutimana et al. (2026)
Mixed-methods study of 300 Rwandans aged 18–32
Recent evidence of modest financial knowledge and digital-financial-literacy gaps among Rwandan youth.
Diagnostic/intervention-design study; not the proposed personalized learning and micro-credential platform.
Rustemi et al. (2023)
SLR of blockchain-based academic certificate verification systems
Shows blockchain credential verification is an established research area.
Credential focus; does not integrate personalized financial-literacy learning.

Table 3. Summary of reviewed literature.
2.7 General Comments and Research Gap
The literature establishes that financial literacy is an important educational problem, digital delivery can support financial education, personalized learning can adapt content to learner evidence, and blockchain can support management and verification of digital learning credentials. However, four gaps remain relevant to this project. First, there is a contextual gap: recent Rwandan evidence identifies youth digital financial-literacy needs, but there is limited published work on a personalized financial-literacy learning platform specifically evaluated with university students in Kigali. Second, there is a personalization gap: financial education applications may deliver useful content without transparently mapping individual diagnostic weaknesses to targeted, internally structured learning modules. Third, there is an evaluation gap: educational effectiveness, recommendation correctness/relevance, usability, and software performance are not always measured together. Fourth, blockchain credential systems are commonly studied as credential infrastructure rather than as a small end-stage component connected to an assessment-driven financial-literacy learning pathway.
The proposed study addresses these gaps through a lightweight full-stack system that uses domain-level diagnostic scores and explicit rules to generate personalized learning recommendations. Recommended modules will contain concise curated notes, examples, activities, and quizzes developed from credible sources, allowing learning progress to be tracked within the platform. The study evaluates short-term knowledge change, recommendation accuracy and perceived relevance, usability, task completion, response time, and errors. After a learner successfully demonstrates a defined competency, a minimal blockchain component can register verification information for the resulting micro-credential, which may later be checked by a separate verifier. The intended contribution is therefore not a novel blockchain protocol or advanced recommendation algorithm; it is the design and evaluation of an integrated, contextually relevant software solution for university financial-literacy learning in Kigali.





















CHAPTER THREE: RESEARCH METHODOLOGY AND SYSTEM DESIGN
3.1 Introduction
This chapter describes how the study will identify user needs, develop the proposed software, collect evaluation data, and analyze results. The methodology combines mixed-methods research with design-and-development research and an iterative software development process. Quantitative methods will measure financial knowledge, recommendation accuracy, usability scores, task completion, performance, and credential verification. Qualitative feedback will explain user experiences, recommendation relevance, navigation challenges, and suggested improvements.
3.2 Research Design
A mixed-methods design will be used because the research questions require both measurable outcomes and explanatory user feedback. The needs-assessment phase will collect quantitative responses about financial literacy topics and learning preferences, with optional open-ended questions or short interviews to capture concerns that structured items may miss. The evaluation phase will combine pre-test/post-test scores, usability ratings, system logs, recommendation checks, and qualitative comments.
3.2.1 Software Development Life Cycle
The software will be developed using an Agile-inspired iterative SDLC. Work will proceed through repeated cycles of requirements refinement, interface and data design, implementation, testing, user feedback, and revision. This approach is suitable because early prototypes can expose usability and logic problems before the full platform is complete. The first iteration will prioritize authentication, assessment, scoring, and recommendation; the second will add learning modules, quizzes, and progress; the final iteration will integrate the blockchain credential feature and evaluation logging.
3.2.2 Population and Sampling
The target population is university students in Kigali, Rwanda. African Leadership University will serve as the principal accessible site because it provides a feasible student population for recruitment and pilot testing. Approximately 30–50 students will be recruited for the needs assessment and approximately 30 students for the platform evaluation. Purposive and convenience sampling will be used because the capstone requires participants who are available, are university students, can access an internet-enabled device, and can complete the full testing procedure.
Inclusion criteria will be: currently enrolled university student; at least 18 years old; willing to provide informed consent; access to an internet-enabled device; and ability to complete the diagnostic assessment, selected learning modules, post-test, and feedback instruments. Participants who do not consent or cannot complete the core evaluation procedure will be excluded from paired pre-test/post-test analysis. A small pilot of approximately five students will be used to identify ambiguous questions and major usability defects before the main evaluation.
3.2.3 Data Collection Instruments and Procedure
Primary data will be collected using a needs-assessment questionnaire, a financial literacy pre-test/post-test, a usability questionnaire, a recommendation-relevance questionnaire, system usage logs, observation notes, and optional short interviews. The financial literacy assessment will contain items mapped to the selected domains: budgeting, saving, debt and interest, investment basics, and digital financial literacy. To support paired analysis, the pre-test and post-test will measure the same constructs and use comparable scoring.
The research procedure will begin with a literature review and needs assessment. Findings will be translated into system requirements, financial-literacy domains, learning objectives, and learning content. Core module content will be synthesized from credible financial-literacy resources into concise original notes, examples, practical activities, and quizzes; selected external resources may be added only as supplementary material. After prototype development and pilot testing, participants in the main evaluation will complete a pre-test/diagnostic assessment, receive recommendations based on domain scores, use the recommended modules, complete module quizzes, and complete a post-test and usability/relevance questionnaire. System logs will capture recommendation decisions, progress, task completion, technical errors, and, where applicable, micro-credential issuance and verification events.
3.2.4 Metrics for Evaluation
Evaluation area
Metric / instrument
Analysis
Knowledge improvement
Pre-test and post-test total/domain scores
Mean, SD, paired-samples t-test at α = .05; Wilcoxon signed-rank test if assumptions are not satisfied; effect-size information where appropriate.
Recommendation accuracy
Correctly matched recommendations / total recommendations × 100
Compare generated recommendation with predefined domain-threshold ground truth.
Recommendation relevance
5-point Likert items
Mean/median distribution and qualitative comments.
Usability
SUS or structured usability questionnaire
Overall score plus item-level/qualitative interpretation.
Task completion
Successful completion of login, assessment, module, quiz, progress and verification tasks
Completion percentage and observed failure points.
Technical performance
Response/recommendation generation time, error frequency
Descriptive statistics and defect log.
Blockchain micro-credentials
Issuance success, verification success, altered-credential detection, revocation correctness, transaction/contract errors
Success rates and defect log; optional Sepolia confirmation time.

Table 7. Proposed evaluation metrics.
A paired-samples t-test will be used to determine whether the mean difference between pre-test and post-test financial literacy scores is statistically significant at α = .05. The same participants will complete both assessments. The normality of the difference scores will be assessed; if assumptions are not satisfied, the Wilcoxon signed-rank test will be used. Means, standard deviations, and effect-size information will be reported where appropriate. The analysis will be interpreted as short-term knowledge change and not as evidence of long-term financial behaviour change.
Recommendation accuracy will be measured by comparing each generated recommendation against a predefined ground-truth mapping derived from assessment-domain scores. A recommendation will be considered correct when the recommended module corresponds to a domain classified as requiring further learning according to the predefined threshold. Recommendation accuracy will equal the number of correctly matched recommendations divided by the total number of recommendations, multiplied by 100. Perceived relevance will additionally be measured using five-point Likert items, including a statement such as “The recommended learning content was relevant to my financial literacy needs.”

3.3 System Analysis
3.3.1 Functional Requirements
ID
Functional requirement
FR1
Allow users to register, log in, log out, and manage a basic profile.
FR2
Administer a diagnostic financial literacy assessment.
FR3
Calculate total and domain-level assessment scores.
FR4
Generate personalized learning recommendations from predefined rules.
FR5
Display financial literacy learning modules and resources.
FR6
Display short curated financial-literacy modules, examples, activities, and optional supplementary resources.
FR7
Track module completion, quiz results, and learning progress.
FR8
Collect user feedback and recommendation-relevance ratings.
FR9
Allow administrators to manage modules, questions, and selected reports.
FR10
Issue, share, verify, and where appropriate revoke a blockchain-backed micro-credential after competency conditions are satisfied.
FR11
Record technical events required for evaluation, including errors and task completion.

Table 5. Functional requirements.
3.3.2 Non-Functional Requirements
Category
Requirement
Usability
The interface should be understandable to first-time student users and support completion of core tasks with minimal assistance.
Performance
Assessment scoring and recommendation generation should complete within an acceptable interactive response time under pilot load.
Security
Authentication, role checks, validation, and secure database rules should restrict unauthorized access.
Privacy
Personal financial records will not be requested; assessment responses and user data remain off-chain.
Reliability
Core operations should fail gracefully and preserve consistent progress records.
Maintainability
The codebase should use modular components, version control, documented rules, and clear database schemas.
Compatibility
The application should work on modern desktop and mobile browsers.
Accessibility
Text, navigation, contrast, labels, and form interactions should follow basic accessible-design practices.

Table 6. Non-functional requirements.
3.3.3 Proposed Recommendation Model
The recommendation model will be deterministic and rule based. Assessment questions will be tagged by domain. For each domain, the platform will calculate the percentage of correctly answered items. A threshold, initially 60%, will classify the domain as requiring further learning. The system will then rank or display modules associated with the weak domains. Where multiple domains fall below the threshold, the lowest-scoring domain can be prioritized first. The model will be implemented as application logic rather than machine learning, which makes the decision path transparent and allows recommendation accuracy to be tested directly.

Figure 2. Recommendation and learning flow.
3.3.4 Blockchain Micro-Credential Logic
The blockchain component will be activated only after a learner satisfies predefined competency criteria, such as completing the required module activities and achieving a minimum quiz score. The application will create a micro-credential representing the specific financial-literacy competency demonstrated, generate a credential identifier and cryptographic hash, and submit only minimal verification information through a Solidity smart contract deployed on the Ethereum Sepolia testnet. The application database will retain the learner profile, assessment results, progress, detailed quiz records, and credential metadata. A learner may share a credential identifier or verification link with a separate verifier. Verification will recompute or retrieve the presented credential information and compare it with the blockchain record; altered or revoked credentials should fail validation. The smart contract will therefore support a narrow set of functions such as issue, verify/retrieve, and revoke. No cryptocurrency trading, DeFi, NFT marketplace, or sensitive personal/financial data will be included.
3.4 System Design
3.4.1 System Architecture
The proposed architecture follows a layered client-server structure. Students, administrators, and external verifiers interact with a React and TypeScript web client. The backend coordinates authentication, assessment and scoring, recommendation, learning-content delivery, quiz and progress tracking, reporting, and a micro-credential service. PostgreSQL/Supabase will remain the primary data store. Only the micro-credential service will interact with Web3/Ethers and a Solidity smart contract on the Ethereum Sepolia testnet. This keeps the blockchain boundary explicit: it is an external verification registry rather than the application database or the recommendation engine.

Figure 3. Proposed system architecture.
3.4.2 Database Design and ERD
The core relational model includes users, assessment results, modules, recommendations, quiz attempts, progress records, and credentials. Foreign-key relationships will connect each learner to their results and progress. Detailed question-level tables may be added during implementation, but the core ERD below represents the main data relationships required by the research questions.

Figure 4. Entity relationship diagram.
3.4.3 Use Case Design
The UML use case diagram defines the system boundary and the interactions of the main actors with the platform. Students can register or log in, take the diagnostic assessment, view personalized recommendations, access learning modules, complete quizzes, track progress, and view/share earned micro-credentials. Administrators can manage learning content and assessment items, view selected reports, and authorize credential issuance or revocation where required. A separate Verifier actor can submit a credential identifier or shared verification link to verify a presented micro-credential without accessing the learner’s private assessment data.

Figure 5. Use case diagram.
3.4.4 UML Class Diagram Design
The UML class diagram models the main software entities and their relationships using the conventions applied in the course material. User is the parent class, while Student and Administrator inherit common user attributes and operations. AssessmentResult stores total and domain scores; FinancialLiteracyDomain links diagnostic performance to LearningModule; Recommendation records why a module was selected; Progress records completion; Quiz records competency assessment; and MicroCredential stores the credential identifier, competency, hash, transaction reference, issue date, and status. The credential class exposes issue(), verify(), and revoke() operations while detailed learning data remains associated with the student and database rather than the blockchain.

Figure 6. UML class diagram.
3.4.5 Sequence Design for Micro-Credential Issuance and Verification
The sequence begins when a learner completes the required module and competency quiz. The web application checks completion and score data in the database. If eligibility is confirmed, the micro-credential service generates a credential identifier/hash and submits minimal verification data to the smart contract. The transaction reference and credential metadata are stored in the application database and the learner can view or share the resulting credential. Later, a separate verifier submits the credential identifier or shared verification data; the application queries the smart contract and returns whether the blockchain record is valid, revoked, or does not match the presented credential.

Figure 7. Blockchain micro-credential issuance and verification sequence diagram.
3.5 Development Tools
The frontend is proposed in React with TypeScript because it supports component-based development, strong typing, and responsive web interfaces. Tailwind CSS or a comparable CSS approach may be used for layout and styling. PostgreSQL, accessed through Supabase or a simple backend service, will provide relational data storage and authentication support. The recommendation engine will be implemented in TypeScript/JavaScript as explicit domain-threshold rules. Solidity will be used for the credential smart contract, with Hardhat or Remix for compilation, testing, and testnet deployment. MetaMask or a comparable wallet may be used during development for testnet interactions. Git and GitHub will provide version control, Figma may support interface design, and browser developer tools/Postman and automated tests will be used for debugging and verification.
Smart-contract testing will cover authorized micro-credential issuance, duplicate handling where relevant, retrieval/verification, revocation, altered-credential detection, and invalid requests. Application tests will cover assessment scoring, threshold classification, recommendation generation, module/progress tracking, quiz scoring, and end-to-end credential issuance and verification. Technical evaluation will record success/failure rates and response or confirmation times where appropriate.
3.6 Ethical Considerations and Limitations
Participation will be voluntary and based on informed consent. Participants will be informed about the study purpose, activities, data collected, expected time commitment, and their right to withdraw. The system will not request bank credentials, mobile-money PINs, complete transaction histories, or other unnecessary sensitive financial information. Research outputs will report aggregate results where possible, and access to administrative functions will be restricted.
The blockchain component requires particular privacy discipline because on-chain records are difficult to alter or remove. For that reason, students’ names, email addresses, personal financial information, assessment answers, detailed scores, and other sensitive educational records will not be written directly to the blockchain. Only minimal credential verification information, such as a credential identifier/hash, issuer reference, status, and transaction reference where appropriate, will be registered. Detailed records will remain in the application database, and the prototype will use the Sepolia testnet rather than Ethereum mainnet.
The study has several limitations. The sample is relatively small and primarily drawn from students who are accessible in Kigali, which limits generalizability. The pilot duration is too short to establish sustained changes in financial behaviour. Participants may improve because they become familiar with the assessment domains, and self-reported usability or relevance may be affected by response bias. Network conditions and device differences may affect measured performance. The blockchain module is a proof-of-concept verification feature on a test network rather than a production credential infrastructure. Conclusions will therefore be restricted to the feasibility, short-term knowledge outcomes, recommendation performance, usability, and technical behaviour observed during the pilot.


3.7 Chapter Summary
The methodology aligns the three objectives with a feasible development and evaluation plan. A needs assessment and literature review will identify student learning gaps; an iterative SDLC will guide the implementation of diagnostic assessment, rule-based recommendations, curated learning modules, quizzes, progress tracking, and micro-credential functionality; and a mixed set of educational, usability, technical, and blockchain metrics will evaluate the prototype. Blockchain remains a secondary end-stage component rather than the core learning or recommendation mechanism.


















REFERENCES
Ahsan, K., Akbar, S., Kam, B., & Abdulrahman, M. D. A. (2023). Implementation of micro-credentials in higher education: A systematic literature review. Education and Information Technologies, 28, 13505–13540. https://doi.org/10.1007/s10639-023-11739-z
Alsobhi, H. A., Alakhtar, R. A., Ubaid, A., Hussain, O. K., & Hussain, F. K. (2023). Blockchain-based micro-credentialing system in higher education institutions: Systematic literature review. Knowledge-Based Systems, 265, 110238. https://doi.org/10.1016/j.knosys.2022.110238
Davis, F. D. (1989). Perceived usefulness, perceived ease of use, and user acceptance of information technology. MIS Quarterly, 13(3), 319–340. https://doi.org/10.2307/249008
Fernandes, D., Lynch, J. G., Jr., & Netemeyer, R. G. (2014). Financial literacy, financial education, and downstream financial behaviors. Management Science, 60(8), 1861–1883. https://doi.org/10.1287/mnsc.2013.1849
Joy, J., & Pillai, R. V. G. (2022). Review and classification of content recommenders in e-learning environment. Journal of King Saud University - Computer and Information Sciences, 34, 7670–7685. https://doi.org/10.1016/j.jksuci.2021.06.009
Kaiser, T., Lusardi, A., Menkhoff, L., & Urban, C. J. (2022). Financial education affects financial knowledge and downstream behaviors. Journal of Financial Economics, 145(2), 255–272. https://doi.org/10.1016/j.jfineco.2021.09.022
Khoo, Y. Y., Yusof, R., & Abe, Y. (2022). Integrating financial literacy into economics courses through digital tools: The Finlite app. Journal of International Education in Business, 15(2), 331–350. https://doi.org/10.1108/JIEB-06-2021-0068
Ntakirutimana, P., Mfitumukiza Ndayisaba, Y., Mani, G., Chipeta, C., McSharry, P., Sowon, K., & Luhanga, E. T. (2026). Preliminary insights on digital financial literacy gaps among Rwandan youth and considerations for AI-powered interventions. Sustainability, 18(9), 4155. https://doi.org/10.3390/su18094155
Raj, N. S., & Renumol, V. G. (2022). A systematic literature review on adaptive content recommenders in personalized learning environments from 2015 to 2020. Journal of Computers in Education, 9(1), 113–148. https://doi.org/10.1007/s40692-021-00199-4
Rustemi, A., Dalipi, F., Atanasovski, V., & Risteski, A. (2023). A systematic literature review on blockchain-based systems for academic certificate verification. IEEE Access, 11, 64679–64696. https://doi.org/10.1109/ACCESS.2023.3289598
Sayinzoga, A., Bulte, E. H., & Lensink, R. (2016). Financial literacy and financial behaviour: Experimental evidence from rural Rwanda. The Economic Journal, 126(594), 1571–1599. https://doi.org/10.1111/ecoj.12217


