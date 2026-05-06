import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductFormPage } from '../../pages/catalog/ProductFormPage';

const mockNavigate = vi.fn();
const mockParams: { id?: string } = {};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockParams,
  };
});

vi.mock('../../components/catalog', () => ({
  ProductScanner: () => <div>scanner-mock</div>,
}));

vi.mock('../../api/catalog', () => ({
  productApi: {
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    uploadImages: vi.fn(),
  },
  categoryApi: {
    getAll: vi.fn(),
  },
}));

vi.mock('../../api/inventory', () => ({
  inventoryApi: {
    getAlertConfig: vi.fn(),
    updateAlertConfig: vi.fn(),
    updateStockLimits: vi.fn(),
  },
}));

import { categoryApi, productApi } from '../../api/catalog';
import { inventoryApi } from '../../api/inventory';

const categoryApiMock = vi.mocked(categoryApi);
const productApiMock = vi.mocked(productApi);
const inventoryApiMock = vi.mocked(inventoryApi);
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

function buildProduct(overrides: Partial<Awaited<ReturnType<typeof productApi.getById>>> = {}) {
  return {
    id: 7,
    name: 'Monitor 24',
    barcode: '123456789',
    sku: 'MON-24',
    description: 'Monitor IPS',
    costPrice: '100',
    salePrice: '150',
    categoryId: 2,
    categoryName: 'Monitores',
    minStockInfo: 20,
    minStockWarning: 10,
    minStockCritical: 5,
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    ...overrides,
  };
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Nombre *'), 'Teclado');
  await user.type(screen.getByLabelText('Precio de Costo ($) *'), '10');
  await user.type(screen.getByLabelText('Precio de Venta ($) *'), '20');
  await user.type(screen.getByLabelText('Sobrestock'), '30');
  await user.type(screen.getByLabelText('Advertencia'), '10');
  await user.type(screen.getByLabelText('Critico'), '5');
}

describe('ProductFormPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockParams.id = undefined;
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    categoryApiMock.getAll.mockResolvedValue([]);
    inventoryApiMock.getAlertConfig.mockResolvedValue({
      productId: '7',
      criticalStock: 4,
      minStock: 8,
      overstockThreshold: 16,
    });
    inventoryApiMock.updateAlertConfig.mockResolvedValue({
      productId: '7',
      criticalStock: 5,
      minStock: 10,
      overstockThreshold: 30,
    });
    inventoryApiMock.updateStockLimits.mockResolvedValue({
      id: 1,
      productId: 1,
      productName: 'Teclado',
      currentStock: 0,
      minStock: 10,
      maxStock: 30,
      active: true,
      version: 1,
    });
    productApiMock.create.mockResolvedValue(buildProduct({ id: 55 }));
    productApiMock.update.mockResolvedValue(buildProduct());
    productApiMock.getById.mockResolvedValue(buildProduct());
    productApiMock.uploadImages.mockResolvedValue();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('syncs alert configuration and stock limits after saving and then navigates', async () => {
    const user = userEvent.setup();

    render(<ProductFormPage />);
    await fillRequiredFields(user);

    await user.click(screen.getByRole('button', { name: 'Crear Producto' }));

    await waitFor(() => {
      expect(productApiMock.create).toHaveBeenCalledTimes(1);
      expect(inventoryApiMock.updateAlertConfig).toHaveBeenCalledWith(55, {
        criticalStock: 5,
        minStock: 10,
        overstockThreshold: 30,
      });
      expect(inventoryApiMock.updateStockLimits).toHaveBeenCalledWith(55, {
        minStock: 10,
        maxStock: 30,
      });
      expect(mockNavigate).toHaveBeenCalledWith('/app/catalog/products');
    });
  });

  it('uses product fallback thresholds when alert config returns 404', async () => {
    mockParams.id = '7';
    inventoryApiMock.getAlertConfig.mockRejectedValue({
      response: { status: 404 },
    });
    productApiMock.getById.mockResolvedValue(buildProduct({
      minStockInfo: 25,
      minStockWarning: 11,
      minStockCritical: 3,
    }));

    render(<ProductFormPage />);

    expect(await screen.findByDisplayValue('25')).toBeInTheDocument();
    expect(screen.getByDisplayValue('11')).toBeInTheDocument();
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
  });

  it('surfaces the load error when alert config returns 401', async () => {
    mockParams.id = '7';
    inventoryApiMock.getAlertConfig.mockRejectedValue({
      response: { status: 401 },
    });

    render(<ProductFormPage />);

    expect(await screen.findByText('Error al cargar el producto')).toBeInTheDocument();
  });

  it('keeps the product save, exposes retry, and retries only threshold sync', async () => {
    const user = userEvent.setup();

    inventoryApiMock.updateAlertConfig
      .mockRejectedValueOnce(new Error('sync failed'))
      .mockResolvedValueOnce({
        productId: '55',
        criticalStock: 5,
        minStock: 10,
        overstockThreshold: 30,
      });

    render(<ProductFormPage />);
    await fillRequiredFields(user);

    await user.click(screen.getByRole('button', { name: 'Crear Producto' }));

    expect(
      await screen.findByText('Se guardo el producto, pero no se pudieron guardar los umbrales. Por favor, intente de nuevo.')
    ).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(productApiMock.create).toHaveBeenCalledTimes(1);
    expect(productApiMock.update).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Reintentar guardar umbrales' }));

    await waitFor(() => {
      expect(inventoryApiMock.updateAlertConfig).toHaveBeenCalledTimes(2);
      expect(inventoryApiMock.updateStockLimits).toHaveBeenCalledTimes(2);
      expect(productApiMock.create).toHaveBeenCalledTimes(1);
      expect(productApiMock.update).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/app/catalog/products');
    });
  });
});
