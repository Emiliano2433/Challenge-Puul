import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { UserRole, type User } from '../users/entities/user.entity';
import { AnalyticsRepository } from './analytics.repository';
import { AnalyticsService, todayIn } from './analytics.service';

const admin = { id: 1, role: UserRole.ADMIN } as User;
const member = { id: 2, role: UserRole.MEMBER } as User;

describe('todayIn', () => {
  it('usa la fecha local, no la de UTC', () => {
    // 15 nov 2026 a las 7 pm en CDMX = 16 nov 01:00 UTC
    const now = new Date('2026-11-16T01:00:00Z');
    expect(todayIn('UTC', now)).toBe('2026-11-16');
    expect(todayIn('America/Mexico_City', now)).toBe('2026-11-15');
  });
});

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let repo: jest.Mocked<
    Pick<AnalyticsRepository, 'overview' | 'estimation' | 'workload'>
  >;

  beforeEach(async () => {
    repo = {
      overview: jest
        .fn()
        .mockResolvedValue({ total: 4, active: 3, done: 1, overdue: 1 }),
      estimation: jest
        .fn()
        .mockResolvedValue({ completed: 1, estimated: 8, spent: 10, over: 1 }),
      workload: jest.fn().mockResolvedValue([]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: AnalyticsRepository, useValue: repo },
        {
          provide: ConfigService,
          useValue: { get: () => 'America/Mexico_City' },
        },
      ],
    }).compile();
    service = moduleRef.get(AnalyticsService);
  });

  it('admin consulta todo el equipo; un miembro solo lo suyo', async () => {
    await service.get(admin);
    await service.get(member);

    expect(repo.overview).toHaveBeenNthCalledWith(1, null, expect.any(String));
    expect(repo.overview).toHaveBeenNthCalledWith(
      2,
      member.id,
      expect.any(String),
    );
    expect(repo.estimation).toHaveBeenLastCalledWith(member.id);
  });

  it('pasa la fecha de hoy en la zona horaria configurada', async () => {
    await service.get(admin);

    const today = todayIn('America/Mexico_City');
    expect(repo.overview).toHaveBeenCalledWith(null, today);
    expect(repo.workload).toHaveBeenCalledWith(null, today);
  });

  it('calcula tasa de finalización y precisión de estimación', async () => {
    const result = await service.get(admin);

    expect(result.overview.completionRate).toBe(0.25);
    expect(result.estimationAccuracy.accuracyRatio).toBe(1.25);
  });

  it('las razones son null cuando no hay datos', async () => {
    repo.overview.mockResolvedValue({
      total: 0,
      active: 0,
      done: 0,
      overdue: 0,
    });
    repo.estimation.mockResolvedValue({
      completed: 0,
      estimated: 0,
      spent: 0,
      over: 0,
    });

    const result = await service.get(admin);

    expect(result.overview.completionRate).toBeNull();
    expect(result.estimationAccuracy.accuracyRatio).toBeNull();
  });
});
