import { Form, Divider, Typography } from 'antd';
import type { FormInstance } from 'antd';
import type { Collection } from '@/types';
import { useSellerProducts } from '@/api/seller';
import { PriceSection } from './PriceSection';
import { ProductsSection } from './ProductsSection';

export interface FormValues {
  offered_price: number;
  gift_product: boolean;
}

interface ApplicationFormProps {
  collection: Collection;
  form: FormInstance<FormValues>;
  selectedProductIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function ApplicationForm({
  collection,
  form,
  selectedProductIds,
  onSelectionChange,
}: ApplicationFormProps) {
  const { data: products = [], isLoading: productsLoading } = useSellerProducts(
    collection.allowed_categories,
  );

  return (
    <div>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ offered_price: collection.price_per_slot, gift_product: false }}
      >
        <PriceSection minPrice={collection.price_per_slot} />
      </Form>

      <Divider />

      <Typography.Title level={5} style={{ marginBottom: 12 }}>
        Выберите товары для участия
      </Typography.Title>

      <ProductsSection
        products={products}
        isLoading={productsLoading}
        selectedIds={selectedProductIds}
        onSelectionChange={onSelectionChange}
      />
    </div>
  );
}
