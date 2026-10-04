import { cleanFilter, label, stageProgress } from './job.models';

describe('job model helpers', () => {
  it('formats enum values as readable labels', () => {
    expect(label('SOLAR_ROOF')).toBe('Solar Roof');
    expect(label('SITE_SURVEY')).toBe('Site Survey');
    expect(label(null)).toBe('');
  });

  it('maps stages to workflow progress', () => {
    expect(stageProgress('SITE_SURVEY')).toBe(0);
    expect(stageProgress('INSTALLATION')).toBe(60);
    expect(stageProgress('COMPLETE')).toBe(100);
  });

  it('drops empty filter values', () => {
    expect(cleanFilter({ stage: null, productType: 'SOLAR', search: '  ' })).toEqual({ productType: 'SOLAR' });
    expect(cleanFilter({ search: ' rao ' })).toEqual({ search: 'rao' });
  });
});
