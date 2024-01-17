import { QueryRowFormat } from "@itwin/core-common";
import { IModelConnection, ScreenViewport } from "@itwin/core-frontend";
import { SmartDeviceAPI } from "./SmartDeviceAPI";

export class Visualization {
    public static hideHouseExterior = async (
        vp: ScreenViewport,
        toggle?: boolean
    ) => {
        const cloudData = await SmartDeviceAPI.getData();
        console.log(cloudData);

        const categoryIds = await Visualization.getCategoryIds(vp.iModel);

        if (toggle) {
            vp.changeCategoryDisplay(categoryIds, toggle);
        } else {
            vp.changeCategoryDisplay(categoryIds, false);
        }
    };

    private static getCategoryIds = async (iModel: IModelConnection) => {
        const categoriesToHide = [
            "'Wall 2nd'",
            "'Wall 1st'",
            "'Dry Wall 2nd'",
            "'Dry Wall 1st'",
            "'Brick Exterior'",
            "'WINDOWS 1ST'",
            "'WINDOWS 2ND'",
            "'Ceiling 1st'",
            "'Ceiling 2nd'",
            "'Callouts'",
            "'light fixture'",
            "'Roof'",
        ];

        const query = `SELECT ECInstanceId FROM Bis.Category
        WHERE CodeValue IN (${categoriesToHide.toString()})`;

        const result = iModel.query(query, undefined, {
            rowFormat: QueryRowFormat.UseJsPropertyNames,
        });
        const categoryIds = [];

        for await (const row of result) {
            categoryIds.push(row.id);
        }

        return categoryIds;
    };
}
