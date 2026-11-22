import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  AdminHeader,
  EditSection,
  StatusBadge,
} from "@/components/admin/admin-ui";
import { DeleteRecordForm } from "@/components/admin/delete-record-form";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { Container } from "@/components/ui/container";
import { getProductForAdmin } from "@/modules/marketplace/admin-queries";
import { CurationForm } from "@/modules/marketplace/components/curation-forms";
import { FileUploader } from "@/modules/marketplace/components/file-uploader";
import {
  ProductDetailsForm,
  VariantsForm,
} from "@/modules/marketplace/components/product-forms";
import { curateProduct } from "@/modules/marketplace/curation-actions";
import {
  deleteProductAsStaff,
  deleteProductFileAsStaff,
  deleteProductImageAsStaff,
  registerProductFileAsStaff,
  registerProductImageAsStaff,
  saveVariantsAsStaff,
  setProductCoverAsStaff,
  updateProductAsStaff,
} from "@/modules/marketplace/staff-product-actions";
import { ImageGrid } from "@/modules/media/components/image-grid";
import { ImageUploader } from "@/modules/media/components/image-uploader";
import { GUIDELINES_PATH } from "@/modules/media/image-specs";
import { mediaFolder } from "@/modules/media/server";

export const metadata: Metadata = { title: "Edit product" };

export default function AdminProductPage({
  params,
}: PageProps<"/admin/products/[id]">) {
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
  params: PageProps<"/admin/products/[id]">["params"];
}) {
  const { id } = await params;
  const data = await getProductForAdmin(id);
  if (!data) notFound();
  const { product, variants, images, files, seller, categories, orderCount } =
    data;

  return (
    <>
      <AdminHeader
        title={product.title}
        eyebrow={`Product · ${seller?.display_name ?? "Unknown shop"}`}
        backHref="/admin/products"
        backLabel="All products"
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
      {seller && seller.status !== "approved" ? (
        <p
          role="note"
          className="mt-6 rounded-(--radius) border border-uv/50 p-4 text-sm"
        >
          The shop &ldquo;{seller.display_name}&rdquo; isn&apos;t approved, so
          its products don&apos;t show in the shop.
        </p>
      ) : null}

      <div className="mt-12 flex flex-col gap-16">
        <EditSection
          title="Details"
          description="Name, URL, description and status. Publishing needs at least one active option (and a download file for digital products)."
        >
          <ProductDetailsForm
            product={product}
            action={updateProductAsStaff.bind(null, product.id)}
          />
        </EditSection>

        <EditSection
          title="Options, prices & stock"
          description="Sizes, colours or editions, each with its own price, SKU and stock. Untick Active to hide an option."
        >
          <VariantsForm
            variants={variants}
            action={saveVariantsAsStaff.bind(null, product.id)}
          />
        </EditSection>

        <EditSection
          title="Photos"
          description="The cover leads in the shop grid and on the product page. Portrait 4:5, 1200 × 1500 px recommended, JPG/PNG/WebP/AVIF up to 8 MB."
        >
          <div className="flex flex-col gap-8">
            <ImageGrid
              images={images}
              leadId={product.cover_asset_id}
              leadLabel="Cover"
              makeLead={setProductCoverAsStaff.bind(null, product.id)}
              remove={deleteProductImageAsStaff.bind(null, product.id)}
            />
            <ImageUploader
              folder={mediaFolder("product", product.id)}
              register={registerProductImageAsStaff.bind(null, product.id)}
              multiple
              defaultAlt={product.title}
              guidelinesHref={GUIDELINES_PATH}
              roles={[{ spec: "product-photo" }]}
            />
          </div>
        </EditSection>

        {product.product_type === "digital" ? (
          <EditSection
            title="Download files"
            description="What buyers get after paying (ZIP, PDF, MP3, WAV, FLAC, AIFF, JPG or PNG up to 50 MB). Stored privately; links expire after 15 minutes."
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
                        action={deleteProductFileAsStaff.bind(
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
                register={registerProductFileAsStaff.bind(null, product.id)}
              />
            </div>
          </EditSection>
        ) : null}

        <EditSection
          title="Shop placement"
          description="Category, featuring, order on the storefront and search text."
        >
          <CurationForm
            product={product}
            categories={categories}
            action={curateProduct.bind(null, product.id)}
          />
        </EditSection>

        <EditSection
          title="Delete"
          description={
            orderCount
              ? `This product was ordered ${orderCount} ${orderCount === 1 ? "time" : "times"}, so it can't be deleted: archive it to take it out of the shop.`
              : "Removes the product, its options, photos and files for good."
          }
        >
          {orderCount ? (
            <p className="text-sm text-muted">
              Set the status to Archived under Details.
            </p>
          ) : (
            <DeleteRecordForm
              label="Delete product"
              confirm={`Delete “${product.title}” with its photos and files? This can't be undone.`}
              action={deleteProductAsStaff.bind(null, product.id)}
            />
          )}
        </EditSection>
      </div>
    </>
  );
}
