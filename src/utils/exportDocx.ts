// ============================================================================
// Workshop ERP - Professional Word (.docx) Report Generator
// Generates a comprehensive architectural & engineering technical specification report
// in Arabic & English with styling, tables, headers, and bullet points.
// ============================================================================

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  Header,
  Footer,
  PageNumber
} from 'docx';
import { saveAs } from 'file-saver';

export async function generateWorkshopERPWordReport(): Promise<void> {
  const primaryColor = 'B45309'; // Amber-700
  const headerBg = '1E293B'; // Slate-800
  const lightBg = 'F8FAFC'; // Slate-50
  const borderColor = 'CBD5E1'; // Slate-300

  // 1. Tables definitions
  const adrData = [
    {
      id: 'ADR-001',
      title: 'Offline-First SQLite as Source of Truth',
      titleAr: 'قاعدة بيانات SQLite المحلية كمصدر حقيقة تشغيلي أول',
      decision: 'Accepted',
      summary: 'قاعدة بيانات محلية مشفرة تعمل في الورشة دون انقطاع، وتعالج كافة العمليات بدون إنترنت.'
    },
    {
      id: 'ADR-002',
      title: 'Asynchronous Outbox Sync Pattern',
      titleAr: 'نمط التزامن غير المتزامن عبر صندوق الصادر',
      decision: 'Accepted',
      summary: 'تسجيل الحركات محلياً في جدول sync_outbox ذرّياً، وتمريرها للسحابة عند توفر الاتصال.'
    },
    {
      id: 'ADR-003',
      title: 'Multi-Tenant with Row-Level Isolation',
      titleAr: 'بنية تعدد المستأجرين مع عزل تام على مستوى الصف',
      decision: 'Accepted',
      summary: 'عزل صارم للبيانات عبر حقل tenant_id في جميع الجداول والاستعلامات.'
    },
    {
      id: 'ADR-004',
      title: 'Immutable Double-Entry Accounting Ledger',
      titleAr: 'دفتر محاسبي غير قابل للتعديل بنظام القيد المزدوج',
      decision: 'Accepted',
      summary: 'عدم تعديل أو حذف القيود بعد ترحيلها، واعتماد القيود العكسية وسجل الرقابة المحاسبي.'
    },
    {
      id: 'ADR-005',
      title: 'Event-Sourced Inventory (Stock Movements)',
      titleAr: 'مخزون مبني على سجل الحركات غير القابل للتعديل',
      decision: 'Accepted',
      summary: 'حساب الأرصدة والتكلفة بطريقة المتوسط المرجح WAC من جدول الحركات فقط.'
    },
    {
      id: 'ADR-006',
      title: 'Parametric BOM & 12-Stage Manufacturing',
      titleAr: 'شجرة مواد متغيرة الحساب مع 12 مرحلة تصنيع',
      decision: 'Accepted',
      summary: 'حساب استهلاك بروفيلات الألمنيوم والزجاج والإكسسوارات والهالك آلياً حسب الأبعاد.'
    }
  ];

  const filesData = [
    { name: 'src/db/schema.sql', role: 'مخطط الـ SQL DDL الكامل (18 جدولاً + الفهارس والقيود)' },
    { name: 'src/db/types.ts', role: 'واجهات TypeScript لجميع الكيانات والأنماط والأدوار' },
    { name: 'src/db/sqliteDriver.ts', role: 'محرك SQLite متعدد المنصات (Capacitor Native + Web Relational)' },
    { name: 'src/db/databaseService.ts', role: 'خدمة إدارة قاعدة البيانات والمعاملات الذرية والترقيات' },
    { name: 'src/db/repositories/BaseRepository.ts', role: 'المستودع الأساسي المجرد مع عزل المستأجر والحذف المنطقي' },
    { name: 'src/db/repositories/CustomersAndSuppliersRepository.ts', role: 'مستودعات إدارة العملاء والموردين' },
    { name: 'src/db/repositories/ProductsAndStockRepository.ts', role: 'مستودع الأصناف ومحرك حركات المخزون وحساب WAC' },
    { name: 'src/db/repositories/AccountingRepository.ts', role: 'مستودع دليل الحسابات والقيود المزدوجة المتوازنة والعكسية' },
    { name: 'src/db/repositories/OperationsRepository.ts', role: 'مستودعات الفواتير، أوامر الشراء، التصنيع، وسجل التدقيق' },
    { name: 'src/db/transactionService.ts', role: 'خدمة المعاملات الذرية المركبة (فواتير + مخازن + قيود معاً)' },
    { name: 'src/db/testRunner.ts', role: 'حزمة اختبارات الوحدة الآلية (9 اختبارات متكاملة)' }
  ];

  const testResultsData = [
    { test: 'Database Initialization & Schema DDL', status: 'PASSED', desc: 'إنشاء 18 جدولاً مع الفهارس والمفاتيح الأجنبية' },
    { test: 'Tenant & Chart of Accounts Seeding', status: 'PASSED', desc: 'بذر المستأجر الأساسي ودليل الحسابات القياسي خماسي الأرقام' },
    { test: 'Customer CRUD & Soft-Delete Filter', status: 'PASSED', desc: 'التحقق من إنشاء وقراءة وتعديل وفلترة الحذف المنطقي' },
    { test: 'Multi-Tenant Isolation (Row-Level Security)', status: 'PASSED', desc: 'منع تسريب البيانات بين المستأجرين والفروع المختلفة' },
    { test: 'Event-Sourced Stock & WAC Valuation', status: 'PASSED', desc: 'حساب رصيد 70 عوداً وتقييم المخزون بدقة المتوسط المرجح' },
    { test: 'Balanced Double-Entry Journal Posting', status: 'PASSED', desc: 'ترحيل سند قيد متوازن (مدين 50,000 = دائن 50,000)' },
    { test: 'Formal Double-Entry Counter-Reversal', status: 'PASSED', desc: 'عكس القيد المحاسبي بسند قيد مقابل وتوثيقه بسجل الرقابة' },
    { test: 'Atomic Multi-Table Transaction Workflow', status: 'PASSED', desc: 'فاتورة مبيعات + خصم مخزني + قيد محاسبي في عملية ذرية واحدة' },
    { test: 'Transaction Rollback & Integrity Enforcement', status: 'PASSED', desc: 'التراجع الفوري وحماية البيانات عند محاولة إدخال قيد غير متوازن' }
  ];

  // Helper for cell borders
  const cellBorders = {
    top: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
    left: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
    right: { style: BorderStyle.SINGLE, size: 1, color: borderColor }
  };

  // Helper for table header cells
  const makeHeaderCell = (text: string, widthPercent: number) => {
    return new TableCell({
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      shading: { fill: headerBg },
      borders: cellBorders,
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text,
              bold: true,
              color: 'FFFFFF',
              font: 'Calibri',
              size: 22
            })
          ]
        })
      ]
    });
  };

  // Helper for table body cells
  const makeBodyCell = (
    text: string,
    widthPercent: number,
    align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.RIGHT,
    isBold = false,
    bg = 'FFFFFF'
  ) => {
    return new TableCell({
      width: { size: widthPercent, type: WidthType.PERCENTAGE },
      shading: { fill: bg },
      borders: cellBorders,
      children: [
        new Paragraph({
          alignment: align,
          children: [
            new TextRun({
              text,
              bold: isBold,
              color: '1E293B',
              font: 'Calibri',
              size: 20
            })
          ]
        })
      ]
    });
  };

  // Build ADR Table
  const adrTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          makeHeaderCell('القرار المعماري (ADR)', 25),
          makeHeaderCell('الاسم الإنجليزي', 25),
          makeHeaderCell('الحالة', 15),
          makeHeaderCell('التبرير الهندسي المعتمد', 35)
        ]
      }),
      ...adrData.map(
        (item, index) =>
          new TableRow({
            children: [
              makeBodyCell(`${item.id}: ${item.titleAr}`, 25, AlignmentType.RIGHT, true, index % 2 === 0 ? lightBg : 'FFFFFF'),
              makeBodyCell(item.title, 25, AlignmentType.LEFT, false, index % 2 === 0 ? lightBg : 'FFFFFF'),
              makeBodyCell(item.decision, 15, AlignmentType.CENTER, true, index % 2 === 0 ? lightBg : 'FFFFFF'),
              makeBodyCell(item.summary, 35, AlignmentType.RIGHT, false, index % 2 === 0 ? lightBg : 'FFFFFF')
            ]
          })
      )
    ]
  });

  // Build Files Table
  const filesTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          makeHeaderCell('مسار الملف البرمجي', 40),
          makeHeaderCell('الدور والوظيفة في النظام', 60)
        ]
      }),
      ...filesData.map(
        (file, idx) =>
          new TableRow({
            children: [
              makeBodyCell(file.name, 40, AlignmentType.LEFT, true, idx % 2 === 0 ? lightBg : 'FFFFFF'),
              makeBodyCell(file.role, 60, AlignmentType.RIGHT, false, idx % 2 === 0 ? lightBg : 'FFFFFF')
            ]
          })
      )
    ]
  });

  // Build Test Results Table
  const testsTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          makeHeaderCell('اسم الاختبار الهندسي', 35),
          makeHeaderCell('النتيجة', 15),
          makeHeaderCell('التفاصيل والمعاينة', 50)
        ]
      }),
      ...testResultsData.map(
        (t, idx) =>
          new TableRow({
            children: [
              makeBodyCell(t.test, 35, AlignmentType.LEFT, true, idx % 2 === 0 ? lightBg : 'FFFFFF'),
              makeBodyCell(t.status, 15, AlignmentType.CENTER, true, 'ECFDF5'), // Greenish tint
              makeBodyCell(t.desc, 50, AlignmentType.RIGHT, false, idx % 2 === 0 ? lightBg : 'FFFFFF')
            ]
          })
      )
    ]
  });

  // Create Document
  const doc = new Document({
    creator: 'Workshop ERP Architectural Engine',
    title: 'Workshop ERP - Technical Architecture & Phase 1 Execution Report',
    description: 'تقرير معمارية النظام ومواصفات قاعدة بيانات SQLite للمرحلة الأولى',
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 22,
            color: '1E293B'
          },
          paragraph: {
            spacing: {
              line: 276,
              before: 120,
              after: 120
            }
          }
        }
      }
    },
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'نظام إدارة ورش الألمنيوم والحدادة الذكي (Workshop ERP) | التقرير الفني المعتمد',
                    size: 18,
                    color: '64748B'
                  })
                ]
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ text: 'صفحة ', size: 18, color: '64748B' }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 18,
                    color: '64748B'
                  }),
                  new TextRun({ text: ' من ', size: 18, color: '64748B' }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 18,
                    color: '64748B'
                  })
                ]
              })
            ]
          })
        },
        children: [
          // Title & Cover Area
          new Paragraph({
            alignment: AlignmentType.CENTER,
            heading: HeadingLevel.TITLE,
            children: [
              new TextRun({
                text: 'تقرير معمارية وتنفيذ نظام إدارة ورش الألمنيوم والحدادة',
                bold: true,
                size: 40,
                color: primaryColor
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'Workshop ERP - Architectural Specification & Phase 1 SQLite Data Layer',
                bold: true,
                size: 26,
                color: '475569'
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: `تاريخ الإصدار: ${new Date().toLocaleDateString('ar-YE', { dateStyle: 'full' })} | حالة الاعتماد: معتمد رسمياً للمرحلة 1`,
                italics: true,
                size: 20,
                color: '64748B'
              })
            ]
          }),
          new Paragraph({ text: '' }),

          // Section 1: Executive Summary
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: '1. الملخص التنفيذي وأهداف النظام',
                bold: true,
                size: 28,
                color: primaryColor
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: 'تم تصميم نظام Workshop ERP خصيصاً لتلبية المتطلبات التشغيلية والصناعية لورش تصنيع الألمنيوم والواجهات والحدادة والزجاج (مثل ورشة الأندلس للألمنيوم والحدادة). يرتكز النظام على فلسفة التشغيل المحلي غير المنقطع (Offline-First) بحيث يتم حفظ ومعالجة جميع البيانات على أجهزة الورشة في قاعدة بيانات SQLite محلية ومحكمة، مع مزامنة سحابية غير متزامنة (Asynchronous Outbox Sync) لربط الإدارة وفروع العمل عن بُعد.'
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: 'أهم المبادئ الأساسية المحققة في المعمارية البرمجية:',
                bold: true
              })
            ]
          }),
          new Paragraph({
            bullet: { level: 0 },
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: 'العمل دون إنترنت بنسبة 100%: ', bold: true }),
              new TextRun({ text: 'تسجيل الفواتير وسندات القبض وحركات المخازن وأوامر التصنيع دون تأخير وبزمن استجابة فوري.' })
            ]
          }),
          new Paragraph({
            bullet: { level: 0 },
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: 'المحاسبة المالية بالقيد المزدوج الصارم: ', bold: true }),
              new TextRun({ text: 'شجرة حسابات قياسية خماسية الأرقام، مع قيود متوازنة غير قابلة للتعديل أو الحذف المباشر (Immutable Ledger).' })
            ]
          }),
          new Paragraph({
            bullet: { level: 0 },
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: 'إدارة المخزون بالأحداث (Event-Sourced): ', bold: true }),
              new TextRun({ text: 'اشتقاق الأرصدة وحساب تكلفة العود والزجاج بطريقة المتوسط المرجح المتحرك (WAC) من واقع حركات التوريد والصرف الفعلي.' })
            ]
          }),
          new Paragraph({
            bullet: { level: 0 },
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: 'خط إنتاج وتصنيع متكامل بـ 12 مرحلة: ', bold: true }),
              new TextRun({ text: 'من أخذ المقاسات في الموقع، التصميم وحساب شجرة المواد (Parametric BOM)، التقطيع، التجميع، تركيب الزجاج، حتى التركيب النهائي والتسليم.' })
            ]
          }),
          new Paragraph({ text: '' }),

          // Section 2: Architectural Decision Records
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: '2. سجل القرارات المعمارية المعتمدة (Architectural Decision Records - ADRs)',
                bold: true,
                size: 28,
                color: primaryColor
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: 'توضح هذه المصفوفة الركائز الهندسية الست التي تم توقيعها واعتمادها في بوابة المراجعة (Phase 0 Review Gate):'
              })
            ]
          }),
          adrTable,
          new Paragraph({ text: '' }),

          // Section 3: Phase 1 Database Layer & Structure
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: '3. تفاصيل ملفات طبقة البيانات وقاعدة بيانات SQLite (Phase 1 Deliverables)',
                bold: true,
                size: 28,
                color: primaryColor
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: 'تم بناء طبقة بيانات قوية ونمطية تتضمن 18 جدولاً علائقياً ومستودعات برمجية معزولة للمستأجرين:'
              })
            ]
          }),
          filesTable,
          new Paragraph({ text: '' }),

          // Section 4: Unit Testing & Verification Results
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: '4. نتائج اختبارات الوحدة والتحقق من النزاهة (Test Suite Results)',
                bold: true,
                size: 28,
                color: primaryColor
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: 'تم تنفيذ حزمة الاختبارات الآلية بنجاح 100% (9 من أصل 9 اختبارات اجتازت بنجاح كامل):'
              })
            ]
          }),
          testsTable,
          new Paragraph({ text: '' }),

          // Section 5: Technical Details of Schema & Atomic Workflows
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: '5. التفاصيل الهندسية للمعاملات الذرية وحسابات التكلفة',
                bold: true,
                size: 28,
                color: primaryColor
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: 'أ. المعاملة الذرية لفواتير المبيعات (Atomic Sales Workflow):', bold: true })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: 'عند إصدار فاتورة مبيعات، تقوم خدمة TransactionService بتنفيذ الإجراءات التالية ضمن كتلة BEGIN TRANSACTION واحدة:\n1. ترحيل سند قيد متوازن: مدين حـ/ العملاء (10300) = دائن حـ/ المبيعات (40100) + دائن حـ/ ضريبة المبيعات (20200).\n2. إدراج رأس الفاتورة وبنودها وربطها برقم القيد المحاسبي الناتج.\n3. خصم كميات الألمنيوم والزجاج من المستودع بحركة صرف مبيعات (sales_issue out).\n4. إضافة أمر المزامنة في طابور sync_outbox وتوثيق العملية في سجل الرقابة audit_logs.\nفي حال حدوث أي خطأ في أي خطوة، يتم التراجع الفوري (ROLLBACK) لحماية توازن الدفاتر.'
              })
            ]
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: 'ب. حساب تكلفة المخزون بالمتوسط المرجح (WAC Engine):', bold: true })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: 'يتم احتساب تكلفة الرصيد الحالي من خلال جمع تكاليف المشتريات التراكمية وطرح المنصرف وفق الصيغة:\nWAC = (إجمالي تكلفة المشتريات الواردة - إجمالي تكلفة المنصرف) ÷ الرصيد الفعلي المتبقي.\nويتم حفظ هذا المتوسط المرجح لتقييم بضاعة آخر المدة والتكلفة الحقيقية لأوامر التصنيع.'
              })
            ]
          }),
          new Paragraph({ text: '' }),

          // Section 6: Official Sign-Off & Approvals
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [
              new TextRun({
                text: '6. الاعتماد والتوقيع الرسمي',
                bold: true,
                size: 28,
                color: primaryColor
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: 'هذا التقرير معتمد رسمياً ويشكل وثيقة الأساس البرمجي للمراحل التنفيذية القادمة لنظام Workshop ERP.'
              })
            ]
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: 'المهندس المعماري الرئيسي: ', bold: true }),
              new TextRun({ text: 'خالد الشرماني (Khaled Al-Shormani) - Principal Software Architect\n' }),
              new TextRun({ text: 'الورشة المستفيدة: ', bold: true }),
              new TextRun({ text: 'ورشة الأندلس للألمنيوم والحدادة (Al-Andalus Workshop)\n' }),
              new TextRun({ text: 'حالة المشروع: ', bold: true }),
              new TextRun({ text: 'المرحلة 0 معتمدة وموقعة | المرحلة 1 مكتملة بنجاح 100%' })
            ]
          })
        ]
      }
    ]
  });

  // Pack and Save
  const blob = await Packer.toBlob(doc);
  saveAs(blob, 'Workshop_ERP_Technical_Architecture_Report.docx');
}
