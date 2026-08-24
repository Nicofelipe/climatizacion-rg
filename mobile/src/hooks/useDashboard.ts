import { useEffect, useState } from "react";

import { DashboardService } from "@/services/DashboardService";

interface DashboardData {

    ivaMes: number;

    comprasMes: number;

    boletasMes: number;

    ultimasBoletas: {

        id:number;

        proveedor:string;

        total:number;

    }[];

}

export function useDashboard(){

    const [data,setData]=useState<DashboardData>();

    const [loading,setLoading]=useState(true);

    useEffect(()=>{

        loadDashboard();

    },[]);

    async function loadDashboard(){

        const response=await DashboardService.getDashboard();

        setData(response);

        setLoading(false);

    }

    return{

        data,

        loading

    }

}