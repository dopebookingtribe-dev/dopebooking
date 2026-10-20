import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  AdminHeader,
  EditSection,
  StatusBadge,
} from "@/components/admin/admin-ui";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { Container } from "@/components/ui/container";
import {
  deleteDraftProduct,
  deleteProductImage,
  registerProductImage,
  saveVariants,
  setProductCover,
  updateProduct,
} from "@/modules/marketplace/actions";
import {
  ProductDetailsForm,
  VariantsForm,
} from "@/modules/marketplace/components/product-forms";
import { getMyProduct } from "@/modules/marketplace/queries";
import { FileUploader } from "@/modules/marketplace/components/file-uploader";
import {
  deleteProductFile,
  registerProductFile,
} from "@/modules/marketplace/file-actions";
import { ImageGrid } from "@/modules/media/components/image-grid";
import { ImageUploader } from "@/modules/media/components/image-uploader";
import { mediaFolder } from "@/modules/media/server";

export const metadata: Metadata = { title: "Edit product" };

export default function EditProductPage({
  params,
}: PageProps<"/dashboard/seller/products/[id]">) {
  return (
    <Container className="py-12">
      <Suspense fallback={<p className="text-muted">Loading product…</p>}>
        <Editor params={params} />
      </Suspense>
    </Container>
  );
}

async function Editor({
  params,
}: {
  params: PageProps<"/dashboard/seller/products/[id]">["params"];
}) {
  const { id } = await params;
  const data = await getMyProduct(id);
  if (!data) notFound();
  const { product, variants, images, files, sellerStatus } = data;
  const editable = sellerStatus === "approved";

  return (
    <>
      <AdminHeader
        title={product.title}
        eyebrow="Edit product"
        backHref="/dashboard/seller"
        backLabel="My shop"
      >
        <StatusBadge status={product.status} />
        {product.status === "published" ? (
          <Link
            href={`/shop/${product.slug}`}
            className="text-sm underline underline-offset-4"
          >
            View in shop
          </Link>
        ) : null}
      </AdminHeader>
      {!editable ? (
        <p className="mt-6 text-muted">
          Your shop isn&apos;t active, so products can&apos;t be edited right
          now.
        </p>
      ) : null}
      <div className="mt-12 flex flex-col gap-16">
        <EditSection
          title="Details"
          description="Set the status to Published when photos and options are ready."
        >
          <ProductDetailsForm
            product={product}
            action={updateProduct.bind(null, product.id)}
          />
        </EditSection>
        <EditSection
          title="Options & prices"
          description="Sizes, colours or editions, each with its own price and stock."
        >
          <VariantsForm
            variants={variants}
            action={saveVariants.bind(null, product.id)}
          />
        </EditSection>
        <EditSection
          title="Photos"
          description="The cover appears in the shop grid. Square or 4:5 photos work best."
        >
          <div className="flex flex-col gap-8">
            <ImageGrid
              images={images}
              leadId={product.cover_asset_id}
              leadLabel="Cover"
              makeLead={setProductCover.bind(null, product.id)}
              remove={deleteProductImage.bind(null, product.id)}
            />
            <ImageUploader
              folder={mediaFolder("product", product.id)}
              register={registerProductImage.bind(null, product.id)}
              multiple
              defaultAlt={product.title}
            />
          </div>
        </EditSection>
        {product.product_type === "digital" ? (
          <EditSection
            title="Download files"
            description="What buyers get after paying. Stored privately; links expire after 15 minutes."
          >
            <div className="flex flex-col gap-6">
              {files.length ? (
                <ul className="divide-y divide-line border-y border-line text-sm">
                  {files.map((file) => (
                    <li
                      key={file.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <span>
                        {file.file_name}
                        <span className="ml-2 text-muted">
                          {(file.size_bytes / 1024 / 1024).toFixed(1)} MB
                        </span>
                      </span>
                      <form
                        action={deleteProductFile.bind(
                          null,
                          product.id,
                          file.id,
                        )}
                      >
                        <ConfirmSubmit
                          message="Remove this file? Past buyers lose access to it."
                          className={buttonClasses(
                            "ghost",
                            "min-h-9 px-3 text-xs",
                          )}
                        >
                          Remove
                        </ConfirmSubmit>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-danger">
                  No files yet. Add one before publishing.
                </p>
              )}
              <FileUploader
                productId={product.id}
                register={registerProductFile.bind(null, product.id)}
              />
            </div>
          </EditSection>
        ) : null}
        {product.status === "draft" ? (
          <EditSection
            title="Delete"
            description="Only drafts can be deleted. Archive published products instead."
          >
            <form action={deleteDraftProduct.bind(null, product.id)}>
              <ConfirmSubmit
                message="Delete this draft and its photos? This can't be undone."
                className={buttonClasses("secondary", "text-danger")}
              >
                Delete draft
              </ConfirmSubmit>
            </form>
          </EditSection>
        ) : null}
      </div>
    </>
  );
}
