-- CreateTable
CREATE TABLE "ArtworkContributor" (
    "artworkId" TEXT NOT NULL,
    "exhibitorId" TEXT NOT NULL,

    CONSTRAINT "ArtworkContributor_pkey" PRIMARY KEY ("artworkId","exhibitorId")
);

-- AddForeignKey
ALTER TABLE "ArtworkContributor" ADD CONSTRAINT "ArtworkContributor_artworkId_fkey" FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtworkContributor" ADD CONSTRAINT "ArtworkContributor_exhibitorId_fkey" FOREIGN KEY ("exhibitorId") REFERENCES "Exhibitor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
