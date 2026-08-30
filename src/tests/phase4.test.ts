import { ProjectsRepository } from '../repositories/ProjectsRepository';
import { MeasurementsRepository } from '../repositories/MeasurementsRepository';
import { QuotationsRepository } from '../repositories/QuotationsRepository';

// Note: These tests assume DatabaseService initializes an in-memory SQLite DB when running tests.
// Adjust DatabaseService or mocks if needed.

describe('Phase 4 repositories basic flows', () => {
  let projectsRepo: ProjectsRepository;
  let measurementsRepo: MeasurementsRepository;
  let quotationsRepo: QuotationsRepository;

  beforeAll(() => {
    projectsRepo = new ProjectsRepository();
    measurementsRepo = new MeasurementsRepository();
    quotationsRepo = new QuotationsRepository();
  });

  test('create project -> list by customer', async () => {
    const project = await projectsRepo.create({
      customer_id: 'cust-1',
      name: 'Test Project',
      status: 'open'
    } as any);
    expect(project).toBeDefined();
    const list = await projectsRepo.listByCustomer('cust-1');
    expect(Array.isArray(list)).toBe(true);
  });

  test('create measurement, update, versioning and images', async () => {
    const m = await measurementsRepo.createMeasurement({
      customer_id: 'cust-1',
      width: 100,
      height: 200,
      quantity: 2,
      measured_by: 'tech-1'
    });
    expect(m).toBeDefined();
    const updated = await measurementsRepo.updateMeasurement(m.id, { width: 150 });
    expect(updated.version).toBeGreaterThanOrEqual(2);
    const versions = await measurementsRepo.listVersions(m.id);
    expect(versions.length).toBeGreaterThanOrEqual(1);

    const img = await measurementsRepo.addImage(m.id, '/tmp/img1.jpg', 'img1.jpg', 'image/jpeg', 1, 'tech-1');
    expect(img).toBeDefined();
    const imgs = await measurementsRepo.listImages(m.id);
    expect(imgs.length).toBeGreaterThanOrEqual(1);
    const removed = await measurementsRepo.removeImage(img.id);
    expect(removed).toBe(true);
  });

  test('create quotation with lines and revisions', async () => {
    const payload = {
      customer_id: 'cust-1',
      date: new Date().toISOString(),
      lines: [
        { product_id: 'prod-1', quantity: 2, unit_price: 100 },
        { product_id: 'prod-2', quantity: 1, unit_price: 200 }
      ]
    } as any;
    const { quotation, items } = await quotationsRepo.createQuotation(payload);
    expect(quotation).toBeDefined();
    expect(items.length).toBeGreaterThanOrEqual(1);
    const revisions = await quotationsRepo.listRevisions(quotation.id);
    expect(revisions.length).toBeGreaterThanOrEqual(1);
  });
});
