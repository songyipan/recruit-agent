import { execFileSync } from "node:child_process"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const outputDir = join(process.cwd(), "uploads", "test-resumes")

const resumes = [
  {
    slug: "song-yipan",
    name: "Song Yipan",
    title: "Senior Frontend and Full Stack Engineer",
    location: "Qingdao, China",
    email: "song.yipan@example.com",
    phone: "+86 138-0000-1001",
    summary:
      "Frontend-focused engineer with practical experience in Vue3, NestJS, schema-driven product design, BPMN workflow tools, Pixel Streaming integration, and technical delivery for industrial software.",
    skills: [
      "Vue3",
      "TypeScript",
      "NestJS",
      "Prisma",
      "MySQL",
      "Redis",
      "Schema-driven UI",
      "BPMN",
      "WebSocket",
      "Pixel Streaming",
    ],
    experience: [
      "2023.11 - Present | Frontend Engineer | Smart Port Technology Co. Built workflow-heavy web systems for operations, safety, and industrial visualization.",
      "Designed a schema-driven form designer with dynamic data binding, role-based permissions, and reusable components for process nodes.",
      "Integrated BPMN workflow configuration with business forms and approval states to reduce repeated delivery work across projects.",
      "Implemented UE5 Pixel Streaming and WebSocket-based data sync for smart substation visualization and device status panels.",
    ],
    projects: [
      "Manufacturing Workflow Platform: Built configurable forms, process configuration pages, permission control, and component libraries for a BPMN-based approval system.",
      "Smart Substation Visualization: Coordinated WebSocket data channels with Pixel Streaming to connect industrial telemetry, 3D scenes, and operational dashboards.",
      "Vue plus NestJS Social App Demo: Designed NestJS modules, Prisma models, authentication, and real-time chat features for a teaching project.",
    ],
    education:
      "BEng in Software Engineering | Qingdao University of Technology | 2019 - 2023",
  },
  {
    slug: "chen-yuxin",
    name: "Chen Yuxin",
    title: "Senior React and Next.js Engineer",
    location: "Shanghai, China",
    email: "chen.yuxin@example.com",
    phone: "+86 138-0000-1002",
    summary:
      "Product-minded frontend engineer who specializes in React, Next.js, design systems, performance optimization, and enterprise dashboards.",
    skills: [
      "React",
      "Next.js",
      "TypeScript",
      "Tailwind CSS",
      "Node.js",
      "GraphQL",
      "Design Systems",
      "Performance Optimization",
      "SSR",
      "Accessibility",
    ],
    experience: [
      "2021.07 - Present | Senior Frontend Engineer | Retail SaaS Company. Led customer-facing admin platform and merchant storefront projects.",
      "Built a reusable design system with tokens, tables, forms, filters, and analytics cards used by five product teams.",
      "Improved core web vitals through route-level code splitting, image strategy, streaming SSR, and query optimization.",
      "Collaborated with backend teams on GraphQL schema design and monitoring for high-traffic seasonal campaigns.",
    ],
    projects: [
      "Merchant Console: Delivered multi-tenant dashboards with fine-grained permissions, search, and configurable reporting.",
      "Storefront Platform: Migrated a legacy React SPA to Next.js for better SEO, faster first paint, and simpler deployment.",
      "Design System Package: Standardized tables, filters, and form patterns to reduce repeated UI work across the company.",
    ],
    education:
      "BSc in Computer Science | East China Normal University | 2017 - 2021",
  },
  {
    slug: "li-wenhao",
    name: "Li Wenhao",
    title: "Full Stack Engineer",
    location: "Hangzhou, China",
    email: "li.wenhao@example.com",
    phone: "+86 138-0000-1003",
    summary:
      "Full stack engineer experienced in Vue3, NestJS, Prisma, PostgreSQL, Redis, and real-time collaboration features for SaaS products.",
    skills: [
      "Vue3",
      "NestJS",
      "Prisma",
      "PostgreSQL",
      "Redis",
      "Docker",
      "WebSocket",
      "RBAC",
      "REST API",
      "Monorepo",
    ],
    experience: [
      "2020.08 - Present | Full Stack Engineer | B2B SaaS Startup. Delivered collaboration software for sales, support, and operations teams.",
      "Built NestJS modules for auth, users, chat, approval, and audit logs with clear domain boundaries.",
      "Used Prisma transactions and PostgreSQL schema design to support organization-level isolation and operational reporting.",
      "Delivered Vue3 frontends with dynamic forms, data tables, and message-center features backed by WebSocket events.",
    ],
    projects: [
      "Customer Collaboration Suite: Implemented chat, task tracking, organization permissions, and document comments.",
      "Approval Center: Created a reusable approval engine with node configs, role checks, and notification workflows.",
      "Internal Ops Console: Built advanced query pages for order review, issue tracking, and performance dashboards.",
    ],
    education:
      "BEng in Information Engineering | Zhejiang University of Technology | 2016 - 2020",
  },
  {
    slug: "zhao-min",
    name: "Zhao Min",
    title: "AI Application Engineer",
    location: "Beijing, China",
    email: "zhao.min@example.com",
    phone: "+86 138-0000-1004",
    summary:
      "Applied AI engineer focused on RAG systems, LLM orchestration, prompt evaluation, embeddings, and internal automation products.",
    skills: [
      "Python",
      "FastAPI",
      "RAG",
      "OpenAI API",
      "Embeddings",
      "Vector Search",
      "PostgreSQL",
      "Prompt Engineering",
      "Agent Workflows",
      "Evaluation",
    ],
    experience: [
      "2022.03 - Present | AI Engineer | Enterprise Productivity Lab. Built internal knowledge assistants and workflow automations.",
      "Designed document ingestion, chunking, retrieval, and answer-evaluation pipelines for support and compliance use cases.",
      "Created offline evaluation sets and prompt experiments to compare answer quality, hallucination rate, and task success.",
      "Integrated FastAPI services with frontend chat apps, usage logging, and enterprise knowledge permissions.",
    ],
    projects: [
      "Knowledge Copilot: Built a RAG assistant for policy and process documents with citations and feedback collection.",
      "Recruiting QA Agent: Prototyped resume analysis, interview evaluation, and recommendation flows using embeddings.",
      "Support Automation Toolkit: Added classification, drafting, and summarization features for service teams.",
    ],
    education:
      "MSc in Artificial Intelligence | Beijing Jiaotong University | 2019 - 2022",
  },
  {
    slug: "wang-jiaqi",
    name: "Wang Jiaqi",
    title: "3D Web and Visualization Engineer",
    location: "Shenzhen, China",
    email: "wang.jiaqi@example.com",
    phone: "+86 138-0000-1005",
    summary:
      "Visualization engineer experienced in UE5 integration, Three.js, WebSocket telemetry, digital twins, and industrial monitoring platforms.",
    skills: [
      "UE5",
      "Pixel Streaming",
      "Three.js",
      "WebSocket",
      "TypeScript",
      "Vue3",
      "Digital Twin",
      "Realtime Data",
      "WebRTC",
      "Performance Tuning",
    ],
    experience: [
      "2021.05 - Present | Visualization Engineer | Industrial Digital Twin Studio. Built web-connected 3D systems for factories and infrastructure projects.",
      "Implemented Pixel Streaming-based scene delivery with business-side WebSocket channels for telemetry and command sync.",
      "Built equipment status panels, alarm overlays, and map-based scene navigation for monitoring and emergency response workflows.",
      "Optimized frame rate, bitrate profiles, and reconnection behavior for unstable field network environments.",
    ],
    projects: [
      "Smart Plant Twin: Connected 3D model navigation with live device status, alarms, and maintenance records.",
      "Grid Monitoring Platform: Built operator views for camera linkage, topology navigation, and event handling.",
      "Interactive Demo Toolkit: Created reusable scene control panels and telemetry overlays for proposal demos.",
    ],
    education:
      "BEng in Digital Media Technology | Shenzhen University | 2017 - 2021",
  },
  {
    slug: "liu-siyu",
    name: "Liu Siyu",
    title: "Senior Mobile Engineer",
    location: "Chengdu, China",
    email: "liu.siyu@example.com",
    phone: "+86 138-0000-1006",
    summary:
      "Mobile engineer with strong React Native and Expo experience, shipping commerce and community apps with push, analytics, and payment integrations.",
    skills: [
      "React Native",
      "Expo",
      "TypeScript",
      "Redux Toolkit",
      "Push Notifications",
      "Payments",
      "REST API",
      "Performance Profiling",
      "CI/CD",
      "Crash Monitoring",
    ],
    experience: [
      "2020.06 - Present | Senior Mobile Engineer | Consumer App Studio. Led mobile delivery for e-commerce and creator platforms.",
      "Designed app architecture for modular features, offline cache, navigation flows, and release management.",
      "Integrated push notifications, in-app purchases, payment SDKs, and event tracking across Android and iOS.",
      "Partnered with backend teams on login, coupon, live event, and user growth features.",
    ],
    projects: [
      "Creator Community App: Built feed, profile, direct messages, and campaign tools for creators and brands.",
      "Flash Sale App: Optimized listing performance, payment stability, and experiment instrumentation.",
      "Merchant Companion App: Delivered order alerts, refund flows, and support chat for store operators.",
    ],
    education:
      "BSc in Software Engineering | University of Electronic Science and Technology of China | 2016 - 2020",
  },
  {
    slug: "he-jun",
    name: "He Jun",
    title: "Data Product Frontend Engineer",
    location: "Nanjing, China",
    email: "he.jun@example.com",
    phone: "+86 138-0000-1007",
    summary:
      "Frontend engineer focused on analytics products, low-code reporting, configurable dashboards, and data-heavy enterprise interfaces.",
    skills: [
      "Vue3",
      "ECharts",
      "TypeScript",
      "Low-code",
      "Schema-driven Config",
      "BI Dashboard",
      "SQL",
      "Vite",
      "Pinia",
      "Canvas Editor",
    ],
    experience: [
      "2019.09 - Present | Frontend Engineer | Analytics Platform Team. Delivered internal and external BI products for operations and finance users.",
      "Built configurable dashboards, chart editors, and drag-drop report builders for multiple business domains.",
      "Created schema-based chart and filter configuration panels to support analysts without code changes.",
      "Worked with backend teams on metrics definitions, data freshness checks, and export workflows.",
    ],
    projects: [
      "Executive Dashboard Builder: Created a reusable dashboard editor with chart, filter, and layout configuration.",
      "Campaign Reporting Center: Built attribution dashboards and monitoring views for marketing teams.",
      "Finance Metrics Workspace: Delivered secure report views with role-based data access and audit logs.",
    ],
    education:
      "BSc in Statistics and Computer Applications | Nanjing University of Finance and Economics | 2015 - 2019",
  },
  {
    slug: "xu-bo",
    name: "Xu Bo",
    title: "Backend Platform Engineer",
    location: "Suzhou, China",
    email: "xu.bo@example.com",
    phone: "+86 138-0000-1008",
    summary:
      "Backend-focused engineer who builds scalable platform services using Java, Spring Boot, Kafka, Redis, PostgreSQL, and cloud-native tooling.",
    skills: [
      "Java",
      "Spring Boot",
      "Kafka",
      "Redis",
      "PostgreSQL",
      "Docker",
      "Kubernetes",
      "Observability",
      "Microservices",
      "API Design",
    ],
    experience: [
      "2018.07 - Present | Backend Platform Engineer | Industrial SaaS Group. Built billing, workflow, and integration services for enterprise clients.",
      "Designed service boundaries for user identity, tenant config, order orchestration, and event processing.",
      "Implemented Kafka-based asynchronous workflows for notifications, audit, and integration updates.",
      "Improved service reliability with tracing, alerting, deployment automation, and performance tuning.",
    ],
    projects: [
      "Tenant Platform Core: Built shared services for identity, roles, organization data, and subscription state.",
      "Integration Hub: Developed webhook, callback, and message processing services for ERP and CRM systems.",
      "Approval Workflow API: Implemented workflow state APIs, audit logging, and SLA monitoring for operations teams.",
    ],
    education:
      "BEng in Computer Science | Soochow University | 2014 - 2018",
  },
  {
    slug: "gao-lin",
    name: "Gao Lin",
    title: "Product Full Stack Engineer",
    location: "Guangzhou, China",
    email: "gao.lin@example.com",
    phone: "+86 138-0000-1009",
    summary:
      "Product engineer with strong Next.js, Prisma, PostgreSQL, and payment integration experience for SaaS and growth products.",
    skills: [
      "Next.js",
      "React",
      "TypeScript",
      "Prisma",
      "PostgreSQL",
      "Stripe",
      "REST API",
      "Auth",
      "Analytics",
      "SaaS Billing",
    ],
    experience: [
      "2021.01 - Present | Full Stack Engineer | SaaS Product Studio. Built user onboarding, billing, dashboards, and internal tooling.",
      "Designed product flows from landing pages to account setup, payment, subscription changes, and reporting.",
      "Implemented Prisma-based data models and administrative tooling for support and finance teams.",
      "Worked on authentication, feature flags, experiment instrumentation, and growth analytics.",
    ],
    projects: [
      "Team Workspace SaaS: Built account, workspace, billing, and usage dashboards with role-based settings.",
      "Growth Portal: Delivered content, onboarding, and funnel analytics for self-serve acquisition.",
      "Support Console: Created internal pages for refunds, account recovery, and plan adjustments.",
    ],
    education:
      "BSc in Information Systems | South China University of Technology | 2016 - 2020",
  },
  {
    slug: "deng-rui",
    name: "Deng Rui",
    title: "Mini Program and Cross-platform Engineer",
    location: "Wuhan, China",
    email: "deng.rui@example.com",
    phone: "+86 138-0000-1010",
    summary:
      "Cross-platform engineer focused on WeChat Mini Program, uni-app, Vue, IoT dashboards, and field-operation tools.",
    skills: [
      "WeChat Mini Program",
      "uni-app",
      "Vue",
      "uView",
      "REST API",
      "Bluetooth",
      "Map SDK",
      "Offline Cache",
      "IoT",
      "Device Management",
    ],
    experience: [
      "2019.03 - Present | Cross-platform Engineer | Smart Field Service Company. Built mobile tooling for inspection, dispatch, and device operations.",
      "Delivered WeChat Mini Program and uni-app features for work orders, device scans, map routes, and image uploads.",
      "Integrated Bluetooth peripherals, location services, and offline sync for unstable on-site environments.",
      "Worked with backend services on device status, operations history, and technician performance dashboards.",
    ],
    projects: [
      "Inspection Mini Program: Built checklist execution, issue reporting, and route guidance for technicians.",
      "IoT Device App: Delivered device activation, maintenance records, and push-based status updates.",
      "Dispatch Toolkit: Created task assignment and progress-tracking flows for field supervisors.",
    ],
    education:
      "BEng in Network Engineering | Wuhan University of Technology | 2015 - 2019",
  },
]

function buildResumeText(resume) {
  return [
    `Name: ${resume.name}`,
    `Title: ${resume.title}`,
    `Location: ${resume.location}`,
    `Email: ${resume.email}`,
    `Phone: ${resume.phone}`,
    "",
    "Summary",
    resume.summary,
    "",
    "Core Skills",
    ...resume.skills.map((skill) => `- ${skill}`),
    "",
    "Work Experience",
    ...resume.experience.map((item) => `- ${item}`),
    "",
    "Projects",
    ...resume.projects.map((item) => `- ${item}`),
    "",
    "Education",
    resume.education,
    "",
    "Availability",
    "Open to frontend, full stack, platform, AI, and digital product opportunities depending on role fit.",
  ].join("\n")
}

function createPdfFromText(text, filename) {
  const tempTextPath = join(outputDir, `${filename}.txt`)
  const pdfPath = join(outputDir, `${filename}.pdf`)

  writeFileSync(tempTextPath, text, "utf8")
  const pdfBuffer = execFileSync(
    "/usr/sbin/cupsfilter",
    ["-i", "text/plain", "-m", "application/pdf", tempTextPath],
    {
      encoding: "buffer",
      maxBuffer: 20 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    }
  )

  writeFileSync(pdfPath, pdfBuffer)
  rmSync(tempTextPath)

  return pdfPath
}

function createReadme(manifest) {
  return [
    "Test Resume PDFs",
    "",
    "Use these files with the existing parse-pdf endpoint.",
    "Example:",
    'POST /api/parse-pdf with {"pdfUrl":"http://localhost:3000/uploads/test-resumes/01_song-yipan.pdf"}',
    "",
    "Files:",
    ...manifest.map(
      (item) => `- ${item.filename} | ${item.name} | ${item.title} | ${item.url}`
    ),
    "",
  ].join("\n")
}

mkdirSync(outputDir, { recursive: true })

const manifest = resumes.map((resume, index) => {
  const baseName = `${String(index + 1).padStart(2, "0")}_${resume.slug}`
  createPdfFromText(buildResumeText(resume), baseName)

  return {
    id: index + 1,
    name: resume.name,
    title: resume.title,
    filename: `${baseName}.pdf`,
    url: `/uploads/test-resumes/${baseName}.pdf`,
  }
})

writeFileSync(
  join(outputDir, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8"
)

writeFileSync(join(outputDir, "README.txt"), createReadme(manifest), "utf8")

console.log(`Generated ${manifest.length} PDF resumes in ${outputDir}`)
for (const item of manifest) {
  console.log(`${item.filename} -> ${item.url}`)
}
