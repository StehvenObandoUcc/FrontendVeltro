const fs = require('fs');
const file = 'd:/Escritorio/trabajo/UCC/cuarto/Patrones de Software/Veltro/frontend/src/components/purchasing/PurchaseOrderForm.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "import { useForm, useFieldArray, useWatch } from 'react-hook-form';",
  "import { useForm, useFieldArray, useWatch, Controller } from 'react-hook-form';"
);

content = content.replace(
  "import { SupplierSelect } from './SupplierSelect';",
  "import { SupplierSelect } from './SupplierSelect';\nimport { ProductSearchSelect } from './ProductSearchSelect';"
);

const newHtml = `              {/* Product select */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#1F2937' }}>
                  Product
                </label>
                <Controller
                  control={control}
                  name={\`items.\${index}.productId\` as const}
                  render={({ field }) => (
                    <ProductSearchSelect
                      value={field.value}
                      onChange={field.onChange}
                      products={products}
                      error={errors.items?.[index]?.productId?.message}
                    />
                  )}
                />
              </div>

              {/* Quantity and Unit Cost */}`;

content = content.replace(/\{\/\* Product select \*\/\}[\s\S]*?\{\/\* Quantity and Unit Cost \*\/\}/g, newHtml);

fs.writeFileSync(file, content, 'utf8');
console.log("Regex Replaced successfully!");
